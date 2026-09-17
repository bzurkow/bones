import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { auth } from "../auth.js";
import { toFetchHeaders } from "../lib/fetch-headers.js";
import { canUpdateOrg } from "../organization-permissions.js";
import { hasPermission } from "../permissions.js";

// Better Auth owns sessions/cookies; it isn't wired into tRPC's own request
// pipeline, so procedures ask it directly via auth.api.getSession() (its
// documented way to read a session outside of its own HTTP handler) using
// the incoming request's own headers (cookies included).
export async function createContext({ req }: CreateFastifyContextOptions) {
  const session = await auth.api.getSession({ headers: toFetchHeaders(req.headers) });
  return { session };
}

// Exported so tests can build a context object directly (bypassing
// createContext's real header/cookie parsing) for createCallerFactory --
// see trpc/routers/*.test.ts.
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
// For tests: calls a router's procedures directly in-process with an
// injected context, no HTTP/fastify involved. See trpc/routers/*.test.ts.
export const createCallerFactory = t.createCallerFactory;

// Rejects unauthenticated calls before the procedure body runs, and narrows
// ctx.session from "session | null" to "session" for everything downstream
// -- procedures using this never need their own null check.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// The RBAC primitive (see permissions.ts's hasPermission) -- one procedure
// builder per required feature key, rather than a single hardcoded
// role-name check, since roles are admin-creatable/deletable at runtime
// (db/roles-schema.ts): there's no fixed set of "privileged" role names to
// compare against anymore. FORBIDDEN (not UNAUTHORIZED) since
// protectedProcedure below already established there's a valid session --
// this is "you're signed in, but not allowed," a different failure than
// "you're not signed in."
export function requirePermission(featureKey: string) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!(await hasPermission(ctx.session.user.role, featureKey))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}

// The per-organization RBAC primitive (see organization-permissions.ts's
// canUpdateOrg) -- shaped to read like requirePermission above, but it
// can't just check ctx.session the way that one does: which organization
// applies isn't known until the procedure's own input is parsed, and a
// `.use()` middleware runs *before* `.input()`'s validation in tRPC's
// pipeline. getRawInput() (tRPC's own escape hatch for exactly this -- a
// middleware that needs to inspect input before it's been validated)
// reads organizationId off the raw, not-yet-parsed input instead. Every
// procedure built on this must therefore accept a top-level
// `organizationId` field in its own zod input -- there's no compile-time
// enforcement of that pairing, just this convention.
//
// canUpdateOrg (not the narrower hasOrganizationPermission) is the actual
// check: "if a user has admin organization update permission, then yes,
// they can update, OR they have to have the organization update
// permission" -- the global admin.organizations.update override always
// applies on top of whatever this org's own feature_roles say, for every
// key built on this primitive.
function extractOrganizationId(rawInput: unknown): string | undefined {
  if (typeof rawInput !== "object" || rawInput === null || !("organizationId" in rawInput)) {
    return undefined;
  }
  const value = (rawInput as { organizationId?: unknown }).organizationId;
  return typeof value === "string" ? value : undefined;
}

export function requireOrganizationPermission(featureKey: string) {
  return protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
    const organizationId = extractOrganizationId(await getRawInput());
    if (!organizationId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "organizationId is required." });
    }
    if (!(await canUpdateOrg(organizationId, ctx.session.user.id, ctx.session.user.role, featureKey))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}

// The umbrella "can this session even reach the admin area" gate every
// admin.* procedure already builds on -- now permission-aware rather than
// a hardcoded owner/administrator string compare. That matters concretely,
// not just architecturally: an owner could create a brand-new role and
// grant it page.admin.view through the new AdminPermissions UI, and that
// role has to actually be let in here, not just past web-app's own
// client-side nav filtering (session.enabledFeatures), or it'd see the
// admin nav render and then get FORBIDDEN on every real request.
export const adminProcedure = requirePermission("page.admin.view");
