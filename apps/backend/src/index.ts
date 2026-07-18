import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router.js";

const server = Fastify({ logger: true });

// Dev-only: reflects any origin so both apps/web (Vite's default port) and
// apps/tauri (port 1420) can call this locally. Tighten before deploying.
await server.register(cors, { origin: true });

server.get("/health", async () => ({ status: "ok" }));

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
