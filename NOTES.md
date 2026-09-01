# Bones — Project Notes

## Vision (pivoted 2026-08-31, still being defined — see "Product pivot" below)
~~All-in-one communication tool (messaging, video, etc.), starting with a **notification center** that aggregates notifications from many external services into one place.~~

**Current, not yet fully defined**: Bones is a toolkit an AI can use, not a self-service app-generator SaaS with its own generation UI. Explicit correction from the design handoff's marketing copy (which reads as the latter — "describe your product and Bones builds the whole thing," a v0/Lovable/bolt.new-style wizard): **that framing is wrong.** What "toolkit that your AI can use" actually means operationally isn't settled yet — revisit and firm this up before writing more product copy or building the generation engine (Phase 5/6 below). Don't take the handoff's landing-page pitch as literal product truth in the meantime; it's parked/placeholder, same status as `bones-future-ideas.html`'s content.

## Product pivot (2026-08-31)
Replaced the notification-aggregator concept above. Triggered by a design handoff (`bone_handoff/`, landing/login/home page designs + `COMPONENTS.md`/`tokens.css`/brand assets) — the **visual design system** it specifies (grayscale, Instrument Sans + JetBrains Mono, borders not shadows, no accent color — see `CLAUDE.md` at the repo root once adopted) is confirmed and being adopted; its **marketing copy** (the specific "describe your product, get SSO/schema/API/infra" pitch) is not confirmed as accurate — see "Vision" above.

Everything under "Notification aggregation approach" and "Connector architecture" below is **obsolete** (kept as historical record, not deleted, per this file's usual convention) — there is no notification-polling/connector layer in the new product. "Auth requirements" mostly still applies but needs a reading update: it originally meant *this app's own* login (a Bones account signing into Bones) — that's still true and still SSO-gated, still Google-first. The new product *additionally* needs to generate SSO (SAML/OIDC) *for the apps it builds* — a second, much bigger auth surface, unbuilt, tracked in "Open / next decisions" as its own initiative.

## Notification aggregation approach (obsolete — see "Product pivot")
Chose service-API integration (Gmail API, Slack API, Discord, Calendar, etc.) over OS-level notification interception — more reliable, more maintainable, one integration per source instead of fragile/restricted OS hooks (esp. on macOS).

## Connector architecture (obsolete — see "Product pivot")
Each source is a **connector** with one contract: call `emit(normalizedNotification)` when something new shows up. Everything downstream (local store, event bus, UI) only ever consumes `emit()`'d notifications and doesn't know how a connector gets its data. This makes the ingestion mechanism swappable per source without touching the rest of the app:
- **v1**: connector polls the source's REST API on a timer, diffs against last-seen IDs/timestamps.
- **v2**: connector opens a WebSocket/SSE connection to our own backend relay (which holds the actual webhook subscription from the source), pushes to `emit()` when the relay forwards an event.

Connector logic lives in TypeScript (not Rust) — better SDKs for Gmail/Slack/Discord etc. Rust/Tauri is reserved for OS-level integration (secure token storage via OS keychain, system tray, native OS notifications).

## Auth requirements (this app's own login — see "Product pivot" for the second, unbuilt SSO-for-generated-apps surface)
- No unauthenticated use — the whole app UI gates on a valid session before rendering anything.
- SSO login required. Start with **Google**, but architecture must support adding any provider (Microsoft, GitHub, Apple, etc.) without rework.
- Two distinct OAuth uses to keep separate: (1) "Sign in with Google" for identity/login, (2) Gmail API access for pulling notifications (broader scope, requested as incremental/separate consent, not bundled into login) — **this second one was specific to the old notification-aggregator product and no longer applies.**
- Desktop auth flow: Tauri app opens system browser → backend `/auth/<provider>` → backend completes OAuth, creates/looks up user, issues its own session token → redirects to a custom protocol (`bones://callback`) Tauri catches → session token stored in OS keychain. **Also obsolete** — Tauri was dropped entirely on 2026-08-31, see "Repo restructure" above.
- User's own data lives in our own DB, keyed off the auth provider's `user_id`.

## Chosen stack

**Desktop shell**: Tauri (Rust-backed, not Electron) — much smaller binaries/lower memory than Electron via native OS webview (WebView2/WKWebView/WebKitGTK), and Tauri v2 adds iOS/Android support if mobile is ever in scope. Runs a React frontend inside.

**Backend language**: Node + TypeScript (user's strongest language).

**API layer**: Fastify + tRPC. tRPC gives end-to-end type safety between the TS backend and TS/React client with minimal boilerplate (no hand-maintained REST schemas). Fastify handles the raw HTTP surface tRPC doesn't cover — OAuth callback redirects and incoming webhooks from third parties (Slack, Discord, etc.), since those are hit by external services, not our typed client.

**Database**: PostgreSQL, hosted on **AWS RDS** — see "Data layer" and "Hosting philosophy" below for the full reasoning.

**ORM**: Drizzle — modern, lightweight, no separate query-engine binary (unlike Prisma), SQL-like syntax, strong TS type inference, `drizzle-kit` for migrations. (Prisma considered as the more turnkey/batteries-included alternative — bigger ecosystem, Prisma Studio GUI — but Drizzle is the more current pick.) Note: Drizzle itself is Postgres/SQL-oriented — if the relational-DB choice below changes to something non-Postgres, revisit whether Drizzle is still the right ORM too.

**Auth provider**: **Better Auth**, embedded directly in `apps/backend` — a library, not a separate service, running inside the same Fastify process. Chosen over Auth.js for its more direct/actively-maintained Fastify integration story, and over standalone self-hosted IdPs (Authentik, Zitadel, Keycloak) to avoid running/operating a second service. No SaaS vendor, no free-tier pause risk, we own storing users/sessions in our own DB. (DB host: AWS RDS — see "Data layer" below.)

**Design system**: undecided. Candidates:
- **shadcn/ui** — probably the current go-to/default in the React ecosystem, but ships as vendored source copied into the repo via CLI rather than a normal versioned npm package.
- **Radix UI** — unstyled/headless primitives installed as normal versioned npm packages (`@radix-ui/react-*`), so it stays managed through `package.json`/lockfile like the rest of the dependency tree; would need a separate styling approach (Tailwind, CSS Modules, etc.).

## Routing
React Router, using `BrowserRouter` (switched from `HashRouter` on 2026-08-31, once Tauri was dropped — `HashRouter` existed specifically because Tauri serves the built frontend as static assets over a custom protocol, not a real server that rewrites arbitrary paths back to `index.html`, and `BrowserRouter`'s real-URL routing 404s on refresh/deep-link without that. With Tauri gone that constraint is gone too, and real URLs (no `#`) are worth it for a browser-only app: shareable/bookmarkable links, no `callbackURL` fragment-appending workaround in the OAuth flow (see `Login.tsx`).

**Whenever this actually gets deployed** (S3 + CloudFront per "Hosting philosophy" below), the static host needs to be configured to rewrite unknown paths back to `index.html` (CloudFront: custom error response, 403/404 → `index.html`, 200) — `BrowserRouter` depends on that; Vite's own dev server already does it automatically, which is why this hasn't needed solving yet. If Tauri ever comes back, this tradeoff needs revisiting too — it's the same doesn't-rewrite-paths constraint that motivated `HashRouter` originally.

Auth gate: `RequireAuth` in `App.tsx` (element-based, wraps only the routes that need it via `<Outlet />`, not the whole `<Routes>` tree) rather than a wrapper around everything with a hardcoded `/login` path exception. Redirects to `/login` with `state: { from: location }` so `Login.tsx` can send the user back to where they were headed instead of always landing on `/`.

## Local-polling-to-backend migration plan
Mandatory auth means a backend exists from day one (for auth + user DB), but notification **polling** itself can still run client-side in v1, using tokens brokered/stored via the backend rather than purely local. Moving actual polling/webhook handling server-side later is a swap of connector internals only, not a rearchitect.

## Scaffolding plan (superseded — see "Repo restructure" below)
Single monorepo (yarn workspaces) so tRPC types can be shared end-to-end between backend and clients without publishing packages:
- `apps/tauri` — the Tauri shell (the native/OS-level bits: window, system tray, OS keychain), thin wrapper that mounts `packages/react-ui`. One project, multiple build targets — desktop **scaffolded**; iOS/Android are additional targets on this *same* project (`tauri ios init`/`tauri android init`), not separate apps. Renamed from `apps/desktop` once mobile made that name inaccurate.
- `apps/web` — plain Vite + React web build, thin wrapper that mounts `packages/react-ui`. Exists so the same UI can run in a browser tab, no Tauri/native layer.
- `packages/react-ui` — the actual shared React app (routes, screens, components) that both `apps/tauri` and `apps/web` import and render. Only the auth glue differs per-shell (system browser + OS keychain for desktop vs. standard redirect + cookie for web) — everything else lives here once.
- `apps/backend` — Fastify + tRPC API, Drizzle schema/migrations, OAuth callback + webhook HTTP routes.
- `packages/shared` — shared TS: tRPC router types, normalized notification schema, connector interface (the `emit()` contract).
- `packages/connectors` — per-source connector implementations (Gmail, Slack, Discord, Calendar, …), each implementing the shared connector interface.

Setup order: `apps/backend` skeleton (Fastify+tRPC, health route, Docker/hot reload — unblocked, no dependency on prod hosting) → Drizzle pointed at local Postgres-in-Docker → Better Auth wired up (Google) → wire `apps/tauri`/`apps/web` to backend tRPC client + real auth flow → first connector. Production AWS RDS deploy happens separately, at actual deploy time.

## Repo restructure (2026-08-31)
Desktop/mobile parked for now (see README's "Desktop/mobile (parked)"), and with only one client left, the `apps/*` + `packages/*` split stopped earning its keep. Flattened to a plain two-tier layout:
- `backend/` (was `apps/backend`) — unchanged internally, just relocated.
- `frontend/` (was `apps/web`, merged with `packages/react-ui`) — one standalone Vite + React app instead of a thin shell importing a separate UI package. `packages/react-ui/src/index.ts`'s re-export is gone since there's no longer a package boundary to cross — `main.tsx` imports `./App` directly.
- `apps/tauri`'s own `package.json`/`vite.config.ts`/`index.html`/`src/main.tsx` shell is gone; when revisited, Tauri wraps `frontend` directly rather than needing its own copy of the app (that's how Tauri is designed to work — see README).
- `packages/shared` / `packages/connectors` were never actually scaffolded, so nothing to move there.

Workspaces are now just `["backend", "frontend"]`.

`apps/tauri`'s `src-tauri` (the Rust/Tauri project) was moved to `frontend/src-tauri` as dormant scaffolding, then deleted outright the same day once it was clear it wasn't needed for anything currently planned (`src-tauri` only matters for native desktop/mobile *builds*, not for publishing the web app's static assets — that's just `frontend/dist` to wherever it's hosted, unrelated to Tauri).

All the Tauri-specific JS was then deleted too, rather than kept dormant: `frontend/src/AuthHelpers/desktop-auth.ts` + `desktop-token.ts`, the `isTauri()` branch in `Login.tsx`, the `setDesktopToken(undefined)` calls in `Logout.tsx`/`TopBar.tsx`, `auth-client.ts`'s bearer-token `fetchOptions`, `backend/src/auth.ts`'s `bearer()` plugin, and `backend`'s `/auth/desktop-signin` + `/auth/desktop-bridge` routes. `TRUSTED_ORIGINS` trimmed of the `localhost:1420`/`tauri://localhost`/`https://tauri.localhost` entries those routes needed. Auth is plain cookie-based Better Auth sessions now, browser-only. The deleted desktop OAuth flow (system browser + `bones://` deep link, working around the Tauri webview/system-browser cookie-jar split) is fully documented above under "Open / next decisions" if it needs rebuilding later — that write-up is why the code itself didn't need to survive as a reference.

## Dependency management convention
Shared deps used identically across workspaces (`react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `oxlint`) are declared **once, at the root `package.json`**, and hoisted to every workspace via yarn workspaces rather than re-declared per app — avoids the version drift we hit when `apps/web`'s scaffold pulled a different `typescript` than `apps/tauri`. Only genuinely package-specific deps (e.g. `@tauri-apps/*` in `apps/tauri`) stay local. `syncpack` (`yarn deps:check` / `yarn deps:fix`) lints for any version mismatch that creeps back in across workspaces.

**Revisited in the 2026-08-31 restructure**: with `frontend` now the only consumer of `react`/`vite`/`@vitejs/plugin-react`/`@types/react`/`@types/react-dom`, the "avoid drift across multiple consumers" rationale no longer applies to those — they moved into `frontend/package.json` directly, alongside `better-auth` and `@tauri-apps/*` (also only used there). Root `package.json` now holds only genuinely repo-wide tooling: `typescript`, `oxlint`, `syncpack`, `@types/node` (needed by both `backend`'s runtime types and `frontend`'s Node-context `vite.config.ts`).

## Linting
**Oxlint** (Rust-based, part of the Oxc toolchain) — dramatically faster than ESLint since it's a native binary, though fewer rules/smaller plugin ecosystem. Adopted because `create-vite`'s `react-ts` template defaults to it now; kept it and made it consistent across the whole monorepo rather than mixing linters per app. One shared `.oxlintrc.json` at repo root; each workspace has a `lint` script pointing at it (`oxlint -c ../.oxlintrc.json .`).

Rules on top of the defaults, in `.oxlintrc.json`:
- `func-style: ["error", "declaration"]` — `function foo() {}` over `const foo = () => {}` for readability. Verified oxlint actually enforces it (not just a recognized-but-ignored name) before relying on it.

## TypeScript config convention
Same single-source-of-truth idea as dependencies: a root `tsconfig.base.json` holds compiler options shared across every workspace (strict mode, `target`/`lib`, `jsx`, bundler module resolution, unused-locals/params checks). Each workspace's `tsconfig.json` (or `tsconfig.app.json`/`tsconfig.node.json` for split browser/Node contexts, e.g. app code vs. `vite.config.ts`) does `"extends": "../tsconfig.base.json"` and only overrides what's genuinely different for that context (e.g. `types: ["node"]` + `module: "nodenext"` for the Node-context config that type-checks `vite.config.ts`, ambient `vite/client` types for app code). Fixes the drift we'd already gotten from two different scaffolders (`create-tauri-app` vs. `create-vite`) picking different `target`s and one of them silently missing `strict: true`.

## Formatting
No formatter configured yet (oxlint is a linter, not a formatter — doesn't cover code style/whitespace). Open gap, not yet decided (e.g. Prettier).

## Version policy (pre-v1)
Everything built between now and v1 targets the **latest stable version** available at the time it's added — language runtimes, Docker base images, every dependency — not whatever a scaffolder or habit defaults to. Caught in practice: a Dockerfile draft used `node:22-slim` out of habit despite already running Node v26.5.0 locally (nvm) and `@types/node@^26.1.1`. Once the app actually reaches v1, this policy is expected to relax toward more conservative, deliberately-pinned versions — chasing latest on a shipped/stable product is a different tradeoff than chasing it while still building.

Versions must also **match across the app**, not just each be independently "latest." `syncpack` already covers this for JS/TS deps across the yarn workspace. The Node *runtime* version needs the same treatment once Docker is in play: a single root `.node-version` is the source of truth (chosen over `.nvmrc` — same idea, but also read natively by `fnm`/`nodenv`/GitHub Actions, not just `nvm`, which matters given the cross-platform-team goal), and the Dockerfile takes the version as a build arg read from it rather than hardcoding `FROM node:X` a second time — one number to bump, not two that can drift. Caveat: `nvm` itself doesn't read `.node-version` automatically, so local use is `nvm install $(cat .node-version)` rather than a bare `nvm use`.

## Backend validation approach
Layered smoke checks, each isolating one piece so a failure points at exactly what broke, added *as* each piece is built rather than as a test suite after the fact:
1. Container boots — `docker compose up`, Fastify logs it's listening.
2. `/health` — plain Fastify route (not tRPC), proves the HTTP server is alive independent of tRPC/DB/auth.
3. A trivial tRPC procedure (e.g. `health.ping`) — proves the tRPC adapter/router wiring specifically.
4. A DB-touching procedure (`SELECT 1` via Drizzle) — proves the DB connection + Drizzle setup, independent of which host we land on.
5. An auth-gated procedure — once OAuth exists, proves Better Auth + our session verification end to end.
6. A `/debug` route in `packages/react-ui` with buttons wired to each procedure above, showing raw responses on screen — exercises the *real* client→backend pipe from both `apps/tauri` and `apps/web` (both mount `packages/react-ui`), not just the backend in isolation. Gated on `import.meta.env.DEV` so it never ships in production builds.

**Migrations on boot (2026-08-31)**: `backend`'s four `db:*` scripts (`db:generate`, `db:migrate`, `db:studio`, `db:auth:generate`) stay as-is, but `db:migrate` is no longer something you run by hand for local dev — the Dockerfile's dev-stage `CMD` runs `yarn db:migrate && yarn dev`, so every `yarn backend:dev` brings the DB to the current schema before starting the server. `db:generate`/`db:auth:generate` stay manual on purpose (schema-authoring steps needing human review of the generated output before it's committed); `db:studio` stays manual since it's an on-demand GUI. This needed `docker-compose.yml`'s `postgres` service to get a real `pg_isready` healthcheck and `backend`'s `depends_on` to wait on `condition: service_healthy` instead of just container-started — otherwise migrate could race Postgres actually accepting connections.

## Hosting philosophy
**Single cloud provider: AWS hosts everything.** Explicit preference — operational simplicity of one vendor/one bill/one console over chasing best-per-service pricing or features across multiple providers. Applies to anything actually *hosted* (compute, managed DB, container registry, static assets); doesn't apply to things that aren't hosted anywhere by nature — local dev tools (OrbStack, Drizzle Studio) run on your own machine, and Better Auth is code embedded in our own backend, not a separate vendor. Concrete implications: container images go to **ECR**, not Docker Hub; `apps/web` static hosting is S3 + CloudFront (already the plan); DB hosting below narrows to AWS-only options.

## Data layer — DB hosting decided; auth decided
Supabase was bundling two separate decisions (Postgres host + Auth provider) into one vendor. Revisited both, partly triggered by Supabase's free-tier auto-pause-on-inactivity behavior (projects pause after ~1 week idle, need a manual un-pause).

**Auth: decided — Better Auth**, embedded in `apps/backend` (see "Chosen stack" above). Options considered along the way:
- **Auth.js (NextAuth)** — self-hosted, no SaaS vendor, huge library of prebuilt provider configs, but no first-class official Fastify integration found — likely needs a small adapter bridging Fastify's req/res to its Fetch-based core.
- **Better Auth** ✅ — same self-hosted/no-vendor shape as Auth.js, chosen for its more direct Fastify integration story.
- **Standalone self-hosted IdPs** (Authentik, Zitadel, Keycloak) — more built-in admin/user-management UI, but each is a separate service to run and operate on top of the DB decision below; ruled out to avoid that extra ops surface.
- **Clerk / Auth0** — polished SaaS, but another usage-limited free tier and vendor dependency, same shape of risk as Supabase.
- **Firebase Auth** — generous free tier, easy SSO, but pulls in Google's ecosystem and doesn't naturally pair with a self-hosted Postgres backend.

**DB hosting: decided — AWS RDS PostgreSQL.** Given the "AWS hosts everything" preference above, Neon/Railway/Render are ruled out outright (all non-AWS vendors) without needing to weigh their individual tradeoffs further. Options considered along the way:
- ~~Neon~~ / ~~Railway~~ / ~~Render~~ — all ruled out solely on the single-provider preference, not on their individual merits (which were otherwise reasonable).
- **AWS RDS PostgreSQL** ✅ — the standard fully-managed AWS Postgres, has a genuine (if time-limited, 12 months) free tier, no surprise pausing. Chosen over Aurora specifically: Aurora's benefit is scale/performance headroom this project doesn't need yet, at a real price premium with no meaningful free tier. RDS fits the actual stated motivation (ease) better than Aurora does.
- **Amazon Aurora PostgreSQL** — noted as the natural upgrade path later, not ruled out permanently. Wire-compatible with standard Postgres, so moving to it if/when scale demands it is a bigger instance type, not a migration.
- **Postgres in Docker (self-hosted, forever)** — technically satisfies "one provider" if run on AWS compute, but ruled out because it works against the actual motivation: it trades away RDS's managed backups/HA for us owning that ops burden ourselves, which is the opposite of "easier."

Doesn't block current backend work either way: local dev still runs Postgres in Docker regardless of the production host, so this only matters at actual deploy time.

## Local dev tooling — viewing the DB
**Drizzle Studio** (`drizzle-kit studio`) as the default — free, no extra install since `drizzle-kit` is already a dependency, browser-based so cross-platform, reads the actual Drizzle schema. **Supabase's own dashboard** as a complement (also shows Auth users/sessions). **DBeaver** as a free cross-platform fallback for raw SQL. Deliberately not Postico — Mac-only, conflicts with the cross-platform goal.

## Open / next decisions
- [x] ~~Design system foundation adopted~~ (2026-08-31) — `CLAUDE.md` (build rules) at repo root, `frontend/src/tokens.css` imported in `main.tsx`, new brand mark (`frontend/src/assets/brand/`, `frontend/public/brand/` for favicon/apple-touch-icon), Instrument Sans + JetBrains Mono loaded in `index.html`. Mantine **not** removed — still used by `TopBar`/`Logout`/`AuthenticatedLayout`/the health-check components, none of which were in scope this pass; new pages use the token system directly (plain CSS/CSS Modules, no Mantine components) rather than fighting Mantine's theme API to match a from-scratch design.
- [ ] Login rebuilt to the new design (Google-only) — **deliberately excluded from this pass, revisit later**: Microsoft SSO (user doesn't want to register the app yet), any generic/enterprise SSO or email+password login (explicitly ruled out, not just deferred), and the black proof-panel/marketing copy (dropped entirely — its content asserted the app-generator product claims that turned out to be wrong, see "Vision" above).
- [x] ~~Landing built~~ (2026-09-01) — moved to `/welcome` (was `/`; the authenticated app took over `/`), built in full from `bone_handoff/source/Bones Landing.dc.html`: header, hero, the 6-card "what's included" grid, 3-step "how it works," output section + CodePanel, final CTA, footer. Copy is carried over **verbatim** from the handoff and still describes the app-generator framing "Vision" above flags as unconfirmed -- flagged in a comment at the top of Landing.tsx, expect to revise once the product framing is settled. New reusable components added to support it: Eyebrow, CardGrid, CodePanel. "Start building"/"Generate your first app" CTAs route to `/login`, relaying `RequireAuth`'s `from` state onward (the original design's buttons were same-page `#anchor` scrolls, not real navigation -- adapted for real routing).
- [ ] Home (`/`, authenticated) still a placeholder -- intentionally left alone per explicit ask ("I'll think of something to put there").
- [x] ~~Scaffold `apps/backend`~~ — Fastify + tRPC + Docker skeleton done, validated end to end (health route, tRPC round-trip, hot reload all confirmed working).
- [x] ~~Drizzle schema + `db.ping`~~ — first migration generated and applied against local Postgres, `db.ping` (`SELECT 1`) verified end to end. `DbHealthCheck` added to `packages/react-ui` as its own component (not merged into the existing `HealthCheck`), both rendered dev-only on the home screen.
- [x] ~~Better Auth wired up (Google)~~ — `apps/backend/src/auth.ts` (Drizzle adapter, Google social provider, `trustedOrigins` for the dev client ports). Mounted on Fastify at `/api/auth/*` via a manual Fetch Request/Response bridge, since Better Auth's handler is Fetch-native like Auth.js's. Schema regenerated via `yarn db:auth:generate` (the `@better-auth/cli`) — its generated `users`/`sessions`/`accounts`/`verifications` tables replaced the earlier placeholder `users` table entirely, since Better Auth needs to own that shape; `src/db/schema.ts` now just re-exports `auth-schema.ts` (generated, not hand-edited) plus future domain tables. Verified end to end two ways: `POST /api/auth/sign-in/social` returns a real `accounts.google.com` URL with our actual `client_id`; and hitting that URL directly against Google's real server got a real sign-in page back (200, not an `invalid_client`/`redirect_uri_mismatch` error), confirming the Google Cloud Console side is correctly configured too. Google OAuth client credentials live in `apps/backend/.env` (gitignored).
- [x] ~~Login flow in `packages/react-ui`~~ — `Login.tsx` using Better Auth's own React client (`better-auth/react`'s `createAuthClient`/`useSession`), not hand-rolled fetch calls. Log in / log out button + "user `<email>` logged in", rendered below the health checks but *not* dev-gated (unlike those, this is real functionality).
- [x] ~~Proper desktop auth flow (system browser + `bones://` custom protocol)~~ — `apps/tauri` now opens the system browser for sign-in (full passkey/WebAuthn support, unlike the embedded webview) instead of navigating in-app, via `@tauri-apps/plugin-opener` + `@tauri-apps/plugin-deep-link`. `Login.tsx` branches on Tauri's official `isTauri()` check, so `apps/web` is completely unaffected. Real chain of problems solved, each verified before moving to the next:
  - **Cookie-jar mismatch**: the system browser and the Tauri webview are separate cookie jars, so a session cookie set during OAuth in the browser is invisible to `fetch` calls from the webview. Fixed with Better Auth's `bearer` plugin (`Authorization: Bearer <token>` instead of a cookie) plus a plain `/auth/desktop-bridge` Fastify route that reads the session cookie Better Auth just set (same browser, same request chain) and does the final `bones://callback?token=...` handoff itself — Better Auth's own redirect logic never needs to know about the custom scheme at all.
  - **`state_mismatch` error**: starting the flow via `fetch()` from the Tauri webview (to get the Google auth URL, then opening *that* URL in the system browser) set Better Auth's CSRF state cookie in the *webview's* jar, not the browser's, so the callback failed validation. Fixed by adding `/auth/desktop-signin`, a GET-navigable route (`auth.api.signInSocial()` called server-side) that the system browser is opened at directly — the whole handshake now happens as one browser navigation, one consistent cookie jar throughout.
  - **`Safari cannot open the page because the address is invalid`**: macOS registers custom URL schemes from an app's `Info.plist`, which only exists inside a real bundled `.app` — `tauri dev` just runs the raw debug binary directly (confirmed: no `bundle/` output dir at all), so the OS never had `bones://` registered. Testing this specific piece requires `tauri build --debug` + launching the result via `open` (not `tauri dev`), confirmed via `lsregister -dump` showing the scheme claimed once done. Regular development still uses `tauri dev` as normal; only this one piece needs the bundled app.
  - **Leftover browser tab after signing in**: redirecting a real browser tab straight to `bones://...` leaves it with no page to actually show afterward. `/auth/desktop-bridge` now serves a small "you're signed in, you can close this tab" HTML page that triggers the handoff via `window.location.replace(...)` (with a manual fallback link) instead of a bare HTTP redirect.
  - Token storage is **in-memory only for now** (`desktop-token.ts`, lost on app restart) — deliberately deferred. The mature `@tauri-apps`-official OS-keychain option doesn't exist yet (the community keyring plugin is at `0.1.1`, too immature to depend on for session storage); Stronghold is a real official option but adds its own vault-key-management design decision. Revisit as its own step.
  - Bundle identifier warning caught during the build: `com.bones.app` ending in `.app` isn't recommended (conflicts with the actual `.app` extension convention) — not fixed yet, low priority.

Two real bugs hit and fixed while wiring up Better Auth generally (not desktop-specific), worth knowing about if touched again:
- Fastify's built-in `application/json` content-type parser is more specific than a bare `"*"` wildcard and wins regardless of which scope registers the wildcard — the pass-through parser for Better Auth's raw body needed an explicit `application/json` override too, not just `"*"`.
- `@better-auth/cli`'s schema generation reintroduces a `users` table shape — if we ever hand-edit domain tables again, check they don't silently collide with what Better Auth expects to own.

Also found twice during this work: **`tsx watch` and Vite's dev server don't always pick up bind-mounted/host file changes reliably** (confirmed stale process still running after edits, on both the Dockerized backend and the local Tauri dev server) — if a change doesn't seem to take effect, restart the process before assuming the code is wrong.

`better-auth` itself is hoisted to root (needed identically by both `apps/backend` and `packages/react-ui` once the client was added) per the dependency management convention below.

**Local-dev-only values audited out of source, into env, per explicit ask:**
- `packages/react-ui/src/config.ts`'s `BACKEND_URL` → now reads `import.meta.env.VITE_BACKEND_URL`, sourced from a **root** `.env` (gitignored; `.env.example` committed) that `apps/web` and `apps/tauri` both point their Vite `envDir` at, instead of each needing their own copy. Contains only client-safe values (never secrets) — kept separate from `apps/backend/.env`'s secrets specifically so nothing sensitive ever sits in a location Vite's client-bundle-exposing `VITE_*` scanning could reach.
- `apps/backend/src/auth.ts`'s `trustedOrigins` → now reads `TRUSTED_ORIGINS` (comma-separated) from `apps/backend/.env`, via a new shared `trusted-origins.ts` module.
- Fastify's CORS was `origin: true` (reflects literally any origin) — tightened to use that same `trustedOrigins` list instead. This was a real security loosening beyond what was needed, not just a hardcoded value; verified an untrusted origin no longer gets reflected back.
- [x] ~~Decide production DB host~~ — AWS RDS PostgreSQL, per "Hosting philosophy" (single-provider preference) and "Data layer" above.
- [x] ~~Revisit relational DB choice itself~~ — stays PostgreSQL; no newer alternative (CockroachDB, Turso, SurrealDB, Gel) offered a compelling reason to leave, given this project's actual scale/shape and Postgres's ecosystem/hosting flexibility.
- [ ] Decide Fargate vs. App Runner for backend compute (both AWS, unaffected by anything above).
- [ ] Productionalize public UI assets — once there's a real production domain: `og:url`/`og:image`/canonical link in `frontend/index.html` (left out deliberately for now, see the comment there — need an absolute URL per spec), a proper 1200×630 `og:image` (currently only a square 1024×1024 brand icon exists, `assets/brand/bones-icon-background-1024.png`), and confirm the static host rewrites unknown paths to `index.html` (needed for `BrowserRouter` deep links + crawlers hitting `/login` directly). Revisit whether prerendering public routes (e.g. `vite-react-ssg`, or a Puppeteer build step) is worth it once there's more than one real public page — right now everything's behind `RequireAuth` except `/login`, so there's nothing to prerender yet.
- Decide first 2-3 notification sources to build connectors against (e.g. Gmail, Slack, Discord, Calendar) to design the connector interface against real cases.
- Decide on a formatter (Prettier or otherwise).
