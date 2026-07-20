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
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: oklch(58% 0.13 255);
    font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  .card {
    background: white;
    border: 1px solid oklch(90% 0.008 260);
    border-radius: 16px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
    padding: 2rem;
    max-width: 380px;
    width: 100%;
    text-align: center;
  }
  .card svg {
    width: 72px;
    height: 72px;
  }
  h1 {
    font-size: 1.5rem;
    margin: 0.75rem 0 0;
    color: oklch(22% 0.012 260);
  }
  p {
    color: oklch(50% 0.012 260);
    font-size: 0.9rem;
    margin: 1.5rem 0 0;
  }
  a {
    color: oklch(45% 0.15 255);
  }
</style>
<body>
  <div class="card">
    <svg viewBox="0 0 680 680" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="405" cy="455" rx="175" ry="120" fill="oklch(58% 0.13 255)" />
      <ellipse cx="520" cy="490" rx="95" ry="48" fill="oklch(58% 0.13 150)" transform="rotate(18 520 490)" />
      <ellipse cx="345" cy="560" rx="30" ry="16" fill="oklch(58% 0.13 150)" />
      <ellipse cx="430" cy="565" rx="30" ry="16" fill="oklch(58% 0.13 150)" />
      <ellipse cx="255" cy="345" rx="115" ry="100" fill="oklch(58% 0.13 255)" />
      <ellipse cx="235" cy="365" rx="72" ry="56" fill="oklch(62% 0.13 350)" />
      <path d="M 235 335 Q 130 300 60 330 Q 45 355 60 385 Q 130 415 245 385 Z" fill="oklch(58% 0.13 300)" />
      <path d="M 235 375 Q 140 400 70 380 Q 65 392 78 400 Q 150 425 240 400 Z" fill="oklch(48% 0.13 300)" />
      <circle cx="255" cy="295" r="13" fill="oklch(22% 0.012 260)" />
      <circle cx="259" cy="291" r="4" fill="oklch(98% 0.006 260)" />
    </svg>
    <h1>Platypus</h1>
    <p>${session ? "You're signed in." : "Sign-in failed."} You can close this tab and return to Platypus.</p>
    <p><a href="${redirectUrl}">Click here</a> if you're not returned automatically.</p>
  </div>
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
