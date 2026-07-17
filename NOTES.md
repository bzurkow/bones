# Platypus — Project Notes

## Vision
All-in-one communication tool (messaging, video, etc.), starting with a **notification center** that aggregates notifications from many external services into one place.

## Notification aggregation approach
Chose service-API integration (Gmail API, Slack API, Discord, Calendar, etc.) over OS-level notification interception — more reliable, more maintainable, one integration per source instead of fragile/restricted OS hooks (esp. on macOS).

## Connector architecture
Each source is a **connector** with one contract: call `emit(normalizedNotification)` when something new shows up. Everything downstream (local store, event bus, UI) only ever consumes `emit()`'d notifications and doesn't know how a connector gets its data. This makes the ingestion mechanism swappable per source without touching the rest of the app:
- **v1**: connector polls the source's REST API on a timer, diffs against last-seen IDs/timestamps.
- **v2**: connector opens a WebSocket/SSE connection to our own backend relay (which holds the actual webhook subscription from the source), pushes to `emit()` when the relay forwards an event.

Connector logic lives in TypeScript (not Rust) — better SDKs for Gmail/Slack/Discord etc. Rust/Tauri is reserved for OS-level integration (secure token storage via OS keychain, system tray, native OS notifications).

## Auth requirements
- No unauthenticated use — the whole app UI gates on a valid session before rendering anything.
- SSO login required. Start with **Google**, but architecture must support adding any provider (Microsoft, GitHub, Apple, etc.) without rework.
- Two distinct OAuth uses to keep separate: (1) "Sign in with Google" for identity/login, (2) Gmail API access for pulling notifications (broader scope, requested as incremental/separate consent, not bundled into login).
- Desktop auth flow: Tauri app opens system browser → backend `/auth/<provider>` → backend completes OAuth, creates/looks up user, issues its own session token → redirects to a custom protocol (`platypus://callback`) Tauri catches → session token stored in OS keychain.
- User's own data (connected sources, notifications, preferences) lives in our own DB, keyed off the auth provider's `user_id`.

## Chosen stack

**Desktop shell**: Tauri (Rust-backed, not Electron) — much smaller binaries/lower memory than Electron via native OS webview (WebView2/WKWebView/WebKitGTK), and Tauri v2 adds iOS/Android support if mobile is ever in scope. Runs a React frontend inside.

**Backend language**: Node + TypeScript (user's strongest language).

**API layer**: Fastify + tRPC. tRPC gives end-to-end type safety between the TS backend and TS/React client with minimal boilerplate (no hand-maintained REST schemas). Fastify handles the raw HTTP surface tRPC doesn't cover — OAuth callback redirects and incoming webhooks from third parties (Slack, Discord, etc.), since those are hit by external services, not our typed client.

**Database**: under reconsideration — see "Data layer" below. (Was: PostgreSQL, hosted on Neon or Supabase.)

**ORM**: Drizzle — modern, lightweight, no separate query-engine binary (unlike Prisma), SQL-like syntax, strong TS type inference, `drizzle-kit` for migrations. (Prisma considered as the more turnkey/batteries-included alternative — bigger ecosystem, Prisma Studio GUI — but Drizzle is the more current pick.) Note: Drizzle itself is Postgres/SQL-oriented — if the relational-DB choice below changes to something non-Postgres, revisit whether Drizzle is still the right ORM too.

**Auth provider**: under reconsideration — see "Data layer" below. (Was: Supabase Auth.)

**Design system**: undecided. Candidates:
- **shadcn/ui** — probably the current go-to/default in the React ecosystem, but ships as vendored source copied into the repo via CLI rather than a normal versioned npm package.
- **Radix UI** — unstyled/headless primitives installed as normal versioned npm packages (`@radix-ui/react-*`), so it stays managed through `package.json`/lockfile like the rest of the dependency tree; would need a separate styling approach (Tailwind, CSS Modules, etc.).

## Routing
React Router, using `HashRouter` (not `BrowserRouter`). Tauri serves the built frontend as static assets over a custom protocol, not a real server that rewrites arbitrary paths back to `index.html` — `BrowserRouter`'s real-URL routing can 404 on refresh/deep-link, while `HashRouter` keeps route state in the URL hash (`#/settings`) so it never touches the asset server. Same choice works fine for the web build too.

## Local-polling-to-backend migration plan
Mandatory auth means a backend exists from day one (for auth + user DB), but notification **polling** itself can still run client-side in v1, using tokens brokered/stored via the backend rather than purely local. Moving actual polling/webhook handling server-side later is a swap of connector internals only, not a rearchitect.

## Scaffolding plan
Single monorepo (yarn workspaces) so tRPC types can be shared end-to-end between backend and clients without publishing packages:
- `apps/desktop` — Tauri shell (the native/OS-level bits: window, system tray, OS keychain), thin wrapper that mounts `packages/react-ui`. **Scaffolded.**
- `apps/web` — plain Vite + React web build, thin wrapper that mounts `packages/react-ui`. Exists so the same UI can run in a browser tab, no Tauri/native layer.
- `packages/react-ui` — the actual shared React app (routes, screens, components) that both `apps/desktop` and `apps/web` import and render. Only the auth glue differs per-shell (system browser + OS keychain for desktop vs. standard redirect + cookie for web) — everything else lives here once.
- `apps/backend` — Fastify + tRPC API, Drizzle schema/migrations, OAuth callback + webhook HTTP routes.
- `packages/shared` — shared TS: tRPC router types, normalized notification schema, connector interface (the `emit()` contract).
- `packages/connectors` — per-source connector implementations (Gmail, Slack, Discord, Calendar, …), each implementing the shared connector interface.

Setup order: data layer decided (DB host + auth provider, currently under reconsideration) → `apps/backend` (ORM pointed at real DB, Fastify+tRPC skeleton, Google SSO) → wire `apps/desktop`/`apps/web` to backend tRPC client + real auth flow → first connector. Note: the Fastify/tRPC/Docker skeleton itself (health route, hot reload, etc.) doesn't depend on this decision and can be built in parallel — only the DB-touching and auth-gated validation steps do.

## Dependency management convention
Shared deps used identically across workspaces (`react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `oxlint`) are declared **once, at the root `package.json`**, and hoisted to every workspace via yarn workspaces rather than re-declared per app — avoids the version drift we hit when `apps/web`'s scaffold pulled a different `typescript` than `apps/desktop`. Only genuinely package-specific deps (e.g. `@tauri-apps/*` in `apps/desktop`) stay local. `syncpack` (`yarn deps:check` / `yarn deps:fix`) lints for any version mismatch that creeps back in across workspaces.

## Linting
**Oxlint** (Rust-based, part of the Oxc toolchain) — dramatically faster than ESLint since it's a native binary, though fewer rules/smaller plugin ecosystem. Adopted because `create-vite`'s `react-ts` template defaults to it now; kept it and made it consistent across the whole monorepo rather than mixing linters per app. One shared `.oxlintrc.json` at repo root; each workspace has a `lint` script pointing at it (`oxlint -c ../../.oxlintrc.json .`).

## TypeScript config convention
Same single-source-of-truth idea as dependencies: a root `tsconfig.base.json` holds compiler options shared across every workspace (strict mode, `target`/`lib`, `jsx`, bundler module resolution, unused-locals/params checks). Each workspace's `tsconfig.json` (or `tsconfig.app.json`/`tsconfig.node.json` for split browser/Node contexts, e.g. app code vs. `vite.config.ts`) does `"extends": "../../tsconfig.base.json"` and only overrides what's genuinely different for that context (e.g. `types: ["node"]` + `module: "nodenext"` for the Node-context config that type-checks `vite.config.ts`, ambient `vite/client` types for app code). Fixes the drift we'd already gotten from two different scaffolders (`create-tauri-app` vs. `create-vite`) picking different `target`s and one of them silently missing `strict: true`.

## Formatting
No formatter configured yet (oxlint is a linter, not a formatter — doesn't cover code style/whitespace). Open gap, not yet decided (e.g. Prettier).

## Version policy (pre-v1)
Everything built between now and v1 targets the **latest stable version** available at the time it's added — language runtimes, Docker base images, every dependency — not whatever a scaffolder or habit defaults to. Caught in practice: a Dockerfile draft used `node:22-slim` out of habit despite already running Node v26.5.0 locally (nvm) and `@types/node@^26.1.1`. Once the app actually reaches v1, this policy is expected to relax toward more conservative, deliberately-pinned versions — chasing latest on a shipped/stable product is a different tradeoff than chasing it while still building.

Versions must also **match across the app**, not just each be independently "latest." `syncpack` already covers this for JS/TS deps across the yarn workspace. The Node *runtime* version needs the same treatment once Docker is in play: a single root `.nvmrc` is the source of truth, and the Dockerfile takes the version as a build arg read from it rather than hardcoding `FROM node:X` a second time — one number to bump, not two that can drift.

## Backend validation approach
Layered smoke checks, each isolating one piece so a failure points at exactly what broke, added *as* each piece is built rather than as a test suite after the fact:
1. Container boots — `docker compose up`, Fastify logs it's listening.
2. `/health` — plain Fastify route (not tRPC), proves the HTTP server is alive independent of tRPC/DB/auth.
3. A trivial tRPC procedure (e.g. `health.ping`) — proves the tRPC adapter/router wiring specifically.
4. A DB-touching procedure (`SELECT 1` via Drizzle) — proves the Supabase Postgres connection + Drizzle setup.
5. An auth-gated procedure — once OAuth exists, proves Supabase Auth + our JWT verification end to end.
6. A `/debug` route in `packages/react-ui` with buttons wired to each procedure above, showing raw responses on screen — exercises the *real* client→backend pipe from both `apps/desktop` and `apps/web` (both mount `packages/react-ui`), not just the backend in isolation. Gated on `import.meta.env.DEV` so it never ships in production builds.

## Data layer — under reconsideration
Supabase was bundling two separate decisions (Postgres host + Auth provider) into one vendor. Revisiting both, partly triggered by Supabase's free-tier auto-pause-on-inactivity behavior (projects pause after ~1 week idle, need a manual un-pause).

**DB hosting options considered:**
- **Neon** — closest like-for-like swap for Supabase's Postgres, serverless, generous free tier. Also scales-to-zero on idle, so doesn't fully dodge the pause concern.
- **Railway** — pairs naturally with our Docker-based deployment; double-check current free-tier terms before relying on it, they've shifted pricing models before.
- **Render** — free Postgres tier exists but historically expires free databases after 90 days (not just pauses).
- **AWS RDS** — consistent with a possible Fargate/App Runner deployment (one vendor), no surprise pausing, but more ops burden (VPC/security groups/backups on us) and a time-limited free tier (12 months on a new AWS account).
- **Amazon Aurora PostgreSQL** — AWS's PostgreSQL-compatible managed DB, same one-vendor consistency as RDS with better scalability/performance headroom, but priced above standard RDS Postgres and no meaningful free tier — likely overkill for this stage unless we're already committed to AWS and expect real load.
- **Postgres in Docker** — run it as a container ourselves for dev, something ops-owned for prod. Full control, zero vendor lock-in, but we own backups/scaling/ops entirely.

**Auth options considered:**
- **Auth.js (NextAuth)** — self-hosted, no SaaS vendor at all. Supports Google/GitHub/Microsoft/Apple etc. via prebuilt provider configs. We own storing users/sessions in our own DB (more setup than Supabase Auth), but no free-tier limits or pausing since nothing external is involved.
- **Clerk** — polished auth SaaS with prebuilt UI components, but another usage-limited free tier and another vendor dependency, same shape of risk as Supabase.
- **Firebase Auth** — generous free tier, easy SSO, but pulls in Google's ecosystem and doesn't naturally pair with a self-hosted Postgres backend.

**Leaning (not yet decided):** Auth.js + Neon (or Postgres-in-Docker) — most internally consistent with already going self-hosted/Docker-first for the backend, avoids the pause-on-inactivity surprise on the auth side entirely. Not locked in.

## Local dev tooling — viewing the DB
**Drizzle Studio** (`drizzle-kit studio`) as the default — free, no extra install since `drizzle-kit` is already a dependency, browser-based so cross-platform, reads the actual Drizzle schema. **Supabase's own dashboard** as a complement (also shows Auth users/sessions). **DBeaver** as a free cross-platform fallback for raw SQL. Deliberately not Postico — Mac-only, conflicts with the cross-platform goal.

## Open / next decisions
- [ ] NEXT UP: Scaffold `apps/backend` (Fastify/tRPC/Docker skeleton — doesn't block on the data layer decision below).
- [ ] Decide data layer: DB host + auth provider (see "Data layer — under reconsideration" above).
- [ ] **Revisit relational DB choice itself**: is PostgreSQL still the best/most current choice, or is there something newer worth considering? Deliberately deferred — come back to this as its own conversation rather than deciding inline.
- Decide first 2-3 notification sources to build connectors against (e.g. Gmail, Slack, Discord, Calendar) to design the connector interface against real cases.
- Decide on a formatter (Prettier or otherwise).
