import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Reads the root .env directly instead of needing its own copy of
  // client-safe values like VITE_BACKEND_URL.
  envDir: '..',
  server: {
    // Dev convention as of the marketing-site split: this app is reached at
    // app.localhost, not bare localhost, to mirror the eventual
    // apex-domain (web-static) vs. app.-subdomain (this) production split --
    // Vite's default host allowlist doesn't include it otherwise.
    allowedHosts: ['app.localhost'],
    // Proxies API/tRPC calls to the backend through this same origin,
    // instead of the browser fetching localhost:3000 directly (a
    // different hostname than app.localhost). This is specifically about
    // where the OAuth `state` cookie gets SET -- without the proxy, that
    // fetch is genuinely cross-host from the browser's perspective, which
    // is exactly what third-party-cookie blocking targets regardless of
    // the cookie's own Domain attribute (confirmed: 100% reproducible
    // state_mismatch). With the proxy, the browser only ever talks to
    // app.localhost:5173, so the cookie is set same-origin.
    //
    // BETTER_AUTH_URL stays bare http://localhost:3000 though (see
    // .env), not app.localhost -- Google's own OAuth redirect back to
    // /api/auth/callback/google is a real top-level navigation Google
    // itself initiates, which is NOT proxied (it hits localhost:3000
    // directly, unaware this dev server exists) and google.com won't
    // even accept app.localhost as a registered redirect_uri to begin
    // with (Google's docs: only bare localhost/127.0.0.1 are exempt from
    // its normal domain-verification/HTTPS requirements -- confirmed via
    // an actual Error 400: invalid_request when app.localhost was tried).
    // So the state cookie has to be valid on BOTH hosts: same-origin via
    // this proxy for the initial set, and directly on localhost:3000 for
    // Google's callback -- that's what auth.ts's crossSubDomainCookies
    // (defaulting its Domain to BETTER_AUTH_URL's "localhost", a valid
    // parent domain of app.localhost) is for.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/trpc': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
