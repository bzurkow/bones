import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/trpc.js";
import { auth } from "./auth.js";
import { toFetchHeaders } from "./lib/fetch-headers.js";
import { startLogArchiver } from "./lib/logging/log-archiver.js";
import { registerRequestLogging } from "./lib/logging/register.js";
import { trustedOrigins } from "./trusted-origins.js";

// find-my-way's default maxParamLength (100) caps every route param,
// including the one the tRPC fastify adapter registers for its catch-all
// "/trpc/:path" route -- and tRPC's httpBatchLink puts every batched
// procedure's dotted name, comma-joined, into that exact param (e.g. a
// page batching organizations.listMembers + organizations.roles.list
// together already exceeds 100 chars). Past the limit, find-my-way
// doesn't 404 the route -- it 414s the whole request before tRPC's own
// handler ever runs, which is indistinguishable from the network up
// failing outright client-side. Raised well past anything a realistic
// batch of procedure names could hit.
const server = Fastify({ logger: true, maxParamLength: 5000 });

// Registered before anything else -- see registerRequestLogging's own
// comment on why top-level (not nested inside one of the plugin blocks
// below) is what makes it apply to every route, tRPC and otherwise.
await registerRequestLogging(server);

await server.register(cors, { origin: trustedOrigins, credentials: true });

server.get("/health", async () => ({ status: "ok" }));

// Better Auth's handler expects a standard Fetch Request/Response. It also
// needs the raw, unparsed body to reconstruct that Request correctly, so
// this is scoped to its own plugin context with a pass-through content-type
// parser rather than Fastify's default JSON body parsing.
await server.register(async (instance) => {
  // Fastify's built-in "application/json" parser is more specific than a
  // bare wildcard and wins regardless of which scope registers the
  // wildcard, so it needs an explicit override here too, not just "*".
  instance.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
  instance.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  instance.all("/api/auth/*", async (request, reply) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const headers = toFetchHeaders(request.headers);

    const init: RequestInit = { method: request.method, headers };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = new Uint8Array(request.body as Buffer);
    }

    const response = await auth.handler(new Request(url, init));

    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    reply.send(response.body ? Buffer.from(await response.arrayBuffer()) : null);
  });
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

// No-ops when S3_LOG_BUCKET isn't set -- see log-archiver.ts's own comment.
startLogArchiver();

const port = Number(process.env.PORT ?? 3000);

server.listen({ port, host: "0.0.0.0" }).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
