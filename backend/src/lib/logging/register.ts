import type { FastifyInstance } from "fastify";
import { fastifyRequestContext } from "@fastify/request-context";
import { requestContext } from "./request-context.js";
import { logHttpRequest } from "./request-log.js";

// Wires the two "requests" concerns into a Fastify instance: the
// request-scoped store everything else in this directory reads from
// (request-context.ts), and the onResponse hook that turns every finished
// request into one request-log.ts line.
//
// Called directly against the top-level `server` in index.ts, before any
// route is registered -- not nested inside one of index.ts's own
// `server.register(async (instance) => {...})` blocks (the /api/auth/*
// one, or the tRPC plugin). Fastify's encapsulation model means a hook or
// decoration added inside one of those only applies to that plugin's own
// scope and its children, not to sibling registrations -- and /api/auth/*,
// the tRPC plugin, and this are three siblings. Registering at the top
// level is what makes "every route, present and future" true, including
// routes nobody's written yet.
//
// @fastify/request-context is itself already built this way (it wraps its
// own registration with fastify-plugin internally), so this only needs to
// be careful about the second, hand-rolled half -- the onResponse hook.
export async function registerRequestLogging(server: FastifyInstance): Promise<void> {
  await server.register(fastifyRequestContext, {
    // onRequest (the default hook stage) -- seeded before tRPC's own
    // createContext runs (that happens later, in the route handler stage),
    // so requestId/ip are already in the store by the time createContext
    // adds userId/userEmail to the same store (see request-context.ts's
    // own comment on why both writers share one store).
    defaultStoreValues: (request) => ({ requestId: request.id, ip: request.ip }),
  });

  server.addHook("onResponse", async (request, reply) => {
    logHttpRequest({
      event: "http.request",
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      // Fastify's own elapsed-time tracking (onRequest -> onResponse),
      // not a manually recorded start time -- one less thing for this
      // hook to get wrong.
      durationMs: reply.elapsedTime,
      ip: request.ip,
      requestId: requestContext.get("requestId"),
      userId: requestContext.get("userId"),
      userEmail: requestContext.get("userEmail"),
    });
  });
}
