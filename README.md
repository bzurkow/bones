# Bones

<!-- TODO: proper introduction -->

## Layout

[`backend/`](backend) (Fastify + tRPC API), [`web-app/`](web-app) (Vite + React authenticated app), [`web-static/`](web-static) (Next.js marketing site), and [`shared-ui/`](shared-ui) (design-system components/tokens shared by both frontends).

## Prerequisites

- **Node.js** — version pinned in [`.node-version`](.node-version) (the broadly-supported convention — read natively by `fnm`, `nodenv`, and GitHub Actions' `setup-node`). With [nvm](https://github.com/nvm-sh/nvm), which doesn't read this file automatically, run `nvm install $(cat .node-version) && nvm use $(cat .node-version)` from the repo root instead of the usual bare `nvm use`.
- **Yarn** (classic) — package manager for the whole workspace.

Install workspace dependencies once, from the repo root:

```sh
yarn install
```

## Web app

```sh
yarn web-app:dev
```

Starts the Vite dev server for `web-app` (plain browser build).

## Backend

One-time setup:

```sh
yarn initialize-backend
```

Creates `.env` from `.env.example` if it doesn't already exist (gitignored, not committed — fill in the real secrets after), runs `yarn install`, brings up Postgres, and applies any pending migrations. Safe to re-run any time — every step is a no-op if you've already done it. Leaves Postgres running; doesn't start the backend itself.

Then, to actually run it:

```sh
yarn backend:dev
```

Builds and starts `backend` (Fastify + tRPC, hot reload via bind mount) alongside Postgres, waiting for Postgres to actually be ready before running pending migrations (`db:migrate`) and starting the server — so this alone is also enough from a fresh clone, `initialize-backend` isn't a hard prerequisite, just a way to do the install/DB setup separately from actually starting the server. Once running:

- `curl http://localhost:3000/health` — plain HTTP health check
- `curl http://localhost:3000/trpc/health.ping` — tRPC round-trip check

## Desktop/mobile (not set up)

Out of scope for now — no `src-tauri` project exists in the repo, and there's no Tauri-specific code left in `web-app` or `backend` either (removed rather than kept dormant, per [`NOTES.md`](NOTES.md#repo-restructure-2026-08-31)). Auth is plain cookie-based sessions via Better Auth, browser-only.

To pick Tauri back up: run `tauri init` inside `web-app/` (Tauri wraps a single existing frontend rather than needing its own copy of it — no need to scaffold a separate app), point `tauri.conf.json`'s `devUrl`/`frontendDist` at `web-app`'s own dev server/build output, and add `@tauri-apps/api`, `@tauri-apps/plugin-deep-link`, `@tauri-apps/plugin-opener`, and `@tauri-apps/cli`. The desktop OAuth flow (system browser + `bones://` deep link, to work around the Tauri webview and system browser being separate cookie jars) will need rebuilding from scratch — see NOTES.md's "Open / next decisions" for how it worked before, as a reference. From there, `tauri ios init` / `tauri android init` add the mobile targets on the same project. See [Tauri's own docs](https://v2.tauri.app/start/).
