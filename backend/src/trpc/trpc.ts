import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { auth } from "../auth.js";
import { toFetchHeaders } from "../lib/fetch-headers.js";

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
