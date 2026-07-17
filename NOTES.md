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

**Database**: PostgreSQL, hosted on Neon or Supabase (serverless, easy setup, generous free tiers, standard connection strings).

**ORM**: Drizzle — modern, lightweight, no separate query-engine binary (unlike Prisma), SQL-like syntax, strong TS type inference, `drizzle-kit` for migrations. (Prisma considered as the more turnkey/batteries-included alternative — bigger ecosystem, Prisma Studio GUI — but Drizzle is the more current pick.)

**Auth provider**: Supabase Auth (or Auth.js/NextAuth as a self-hosted alternative) — supports Google, GitHub, Microsoft, Apple, Discord etc. as SSO providers out of the box, so adding a new login provider later is a config change, not new code. Issues JWTs verified by our own API; our own Postgres tables key off `user_id`. Using Supabase also conveniently gives us the Postgres host in the same platform, though we own 100% of our own app tables/business logic.

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

Setup order: Supabase project (Postgres + Auth) → `apps/backend` (Drizzle pointed at Supabase Postgres, Fastify+tRPC skeleton, Google SSO via Supabase Auth) → wire `apps/desktop`/`apps/web` to backend tRPC client + real auth flow → first connector.

## Dependency management convention
Shared deps used identically across workspaces (`react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `oxlint`) are declared **once, at the root `package.json`**, and hoisted to every workspace via yarn workspaces rather than re-declared per app — avoids the version drift we hit when `apps/web`'s scaffold pulled a different `typescript` than `apps/desktop`. Only genuinely package-specific deps (e.g. `@tauri-apps/*` in `apps/desktop`) stay local. `syncpack` (`yarn deps:check` / `yarn deps:fix`) lints for any version mismatch that creeps back in across workspaces.

## Linting
**Oxlint** (Rust-based, part of the Oxc toolchain) — dramatically faster than ESLint since it's a native binary, though fewer rules/smaller plugin ecosystem. Adopted because `create-vite`'s `react-ts` template defaults to it now; kept it and made it consistent across the whole monorepo rather than mixing linters per app. One shared `.oxlintrc.json` at repo root; each workspace has a `lint` script pointing at it (`oxlint -c ../../.oxlintrc.json .`).

## TypeScript config convention
Same single-source-of-truth idea as dependencies: a root `tsconfig.base.json` holds compiler options shared across every workspace (strict mode, `target`/`lib`, `jsx`, bundler module resolution, unused-locals/params checks). Each workspace's `tsconfig.json` (or `tsconfig.app.json`/`tsconfig.node.json` for split browser/Node contexts, e.g. app code vs. `vite.config.ts`) does `"extends": "../../tsconfig.base.json"` and only overrides what's genuinely different for that context (e.g. `types: ["node"]` + `module: "nodenext"` for the Node-context config that type-checks `vite.config.ts`, ambient `vite/client` types for app code). Fixes the drift we'd already gotten from two different scaffolders (`create-tauri-app` vs. `create-vite`) picking different `target`s and one of them silently missing `strict: true`.

## Formatting
No formatter configured yet (oxlint is a linter, not a formatter — doesn't cover code style/whitespace). Open gap, not yet decided (e.g. Prettier).

## Open / next decisions
- [ ] NEXT UP: Scaffold `apps/backend` (Supabase project + Fastify/tRPC/Drizzle skeleton).
- Decide first 2-3 notification sources to build connectors against (e.g. Gmail, Slack, Discord, Calendar) to design the connector interface against real cases.
- Decide on a formatter (Prettier or otherwise).
