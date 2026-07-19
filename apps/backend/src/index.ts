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

// Browser-navigable (GET) entry point for apps/tauri's desktop flow.
// /api/auth/sign-in/social only accepts POST, and the client's signIn.social()
// runs that POST from the Tauri webview -- which then sets the CSRF "state"
// cookie in the *webview's* cookie jar, not the system browser's. When
// Google redirects back to the system browser, that cookie is missing and
// Better Auth rejects it as state_mismatch. Doing the whole handshake as
// one browser navigation, starting here, keeps everything in one cookie jar.
server.get("/auth/desktop-signin", async (_request, reply) => {
  const { headers, response } = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: `${process.env.BETTER_AUTH_URL}/auth/desktop-bridge` },
    returnHeaders: true,
  });

  if (!response.url) {
    reply.status(500).send({ error: "no redirect url from signInSocial" });
    return;
  }

  headers.forEach((value, key) => reply.header(key, value));
  reply.redirect(response.url);
});

// apps/tauri's desktop OAuth flow points its callbackURL here instead of
// straight to platypus://, since the system browser (where this runs) and
// the Tauri webview are separate cookie jars. This route reads the session
// cookie Better Auth just set (same browser, same request chain) and does
// the actual custom-scheme handoff itself -- Better Auth never needs to
// know about platypus:// at all.
server.get("/auth/desktop-bridge", async (request, reply) => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) headers.append(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const session = await auth.api.getSession({ headers });

  const redirectUrl = session
    ? `platypus://callback?token=${encodeURIComponent(session.session.token)}`
    : "platypus://callback?error=no_session";

  // Redirecting a real browser tab straight to a non-web URL leaves it with
  // nothing to actually display -- there's no page for platypus:// to land
  // on. Serving a small page that triggers the handoff via JS (with a
  // manual fallback link) instead gives the tab something to show
  // afterward, and lets the user close it deliberately.
  reply.type("text/html").send(`<!doctype html>
<meta charset="utf-8" />
<title>Signed in</title>
<body style="font-family: system-ui, sans-serif; text-align: center; padding: 4rem;">
  <p>${session ? "You're signed in." : "Sign-in failed."} You can close this tab and return to Platypus.</p>
  <p><a href="${redirectUrl}">Click here</a> if you're not returned automatically.</p>
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</body>`);
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
