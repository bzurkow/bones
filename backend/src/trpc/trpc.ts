import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { auth } from "../auth.js";
import { toFetchHeaders } from "../lib/fetch-headers.js";
import { hasPageViewAccess, hasPermission, hasRouteAccess } from "../permissions.js";

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

// Same shape, against a route instead of a feature -- see
// permissions.ts's hasRouteAccess for why a route is a separate concept
// (and table) from a feature.
export function requireRouteAccess(routeKey: string) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!(await hasRouteAccess(ctx.session.user.role, routeKey))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}

// Same shape again, against a page view.
export function requirePageViewAccess(pageViewKey: string) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!(await hasPageViewAccess(ctx.session.user.role, pageViewKey))) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}

// The umbrella "can this session even reach the admin area" gate every
// admin.* procedure already builds on -- now permission-aware rather than
// a hardcoded owner/administrator string compare. That matters concretely,
// not just architecturally: an owner could create a brand-new role and
// grant it the "admin" route through the new AdminPermissions UI, and that
// role has to actually be let in here, not just past web-app's own
// client-side nav filtering (session.enabledFeatures), or it'd see the
// admin nav render and then get FORBIDDEN on every real request.
export const adminProcedure = requireRouteAccess("admin");
