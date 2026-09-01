import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router.js";
import { auth } from "./auth.js";
import { trustedOrigins } from "./trusted-origins.js";

const server = Fastify({ logger: true });

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
  instance.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) =>
    done(null, body),
  );
  instance.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) =>
    done(null, body),
  );

  instance.all("/api/auth/*", async (request, reply) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) headers.append(key, Array.isArray(value) ? value.join(", ") : value);
    }

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
  trpcOptions: { router: appRouter },
});

const port = Number(process.env.PORT ?? 3000);

server
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    server.log.error(err);
    process.exit(1);
  });
