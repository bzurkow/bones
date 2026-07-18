# Platypus

<!-- TODO: proper introduction -->

## Prerequisites

- **Node.js** — version pinned in [`.node-version`](.node-version) (the broadly-supported convention — read natively by `fnm`, `nodenv`, and GitHub Actions' `setup-node`). With [nvm](https://github.com/nvm-sh/nvm), which doesn't read this file automatically, run `nvm install $(cat .node-version) && nvm use $(cat .node-version)` from the repo root instead of the usual bare `nvm use`.
- **Yarn** (classic) — package manager for the whole workspace.
- **Rust** — via [rustup](https://rustup.rs/). Required for `apps/tauri`, since desktop and mobile all build from the same Tauri project.

Install workspace dependencies once, from the repo root:

```sh
yarn install
```

## Web app

```sh
yarn workspace web dev
```

Starts the Vite dev server for `apps/web` (plain browser build, no Tauri/native layer).

## Desktop app

```sh
yarn workspace tauri tauri dev
```

Compiles the Rust/Tauri shell and opens the app in a native window, with the React frontend hot-reloading same as the web app.

`apps/tauri` is a single Tauri project that targets desktop, iOS, and Android from the same `src-tauri` — not three separate apps. See [Tauri's own docs](https://v2.tauri.app/start/) for more on how the mobile targets work.

## iOS app

> Not yet initialized in this repo — these are the expected commands once it is, not yet verified here.

Requires a **Mac with Xcode installed** — this is an Apple platform restriction, not a Tauri one; iOS builds cannot be built or run on Windows/Linux.

One-time setup:

```sh
yarn workspace tauri ios:init
```

Then, to run in the iOS Simulator (or on a plugged-in device with `--device`):

```sh
yarn workspace tauri tauri ios dev
```

## Android app

> Not yet initialized in this repo — these are the expected commands once it is, not yet verified here.

Requires the **Android SDK** (via Android Studio, or the command-line SDK tools).

One-time setup:

```sh
yarn workspace tauri android:init
```

Then, to run in the Android Emulator (or on a plugged-in device):

```sh
yarn workspace tauri tauri android dev
```

## Backend

```sh
yarn backend:dev
```

Builds and starts `apps/backend` (Fastify + tRPC, hot reload via bind mount) alongside a local Postgres 18 container. Once running:

- `curl http://localhost:3000/health` — plain HTTP health check
- `curl http://localhost:3000/trpc/health.ping` — tRPC round-trip check

Copy `apps/backend/.env.example` to `apps/backend/.env` first (gitignored, not committed).

## Docs

- [`docs/dev/service-map.html`](docs/dev/service-map.html) — architecture diagram of the client/backend/data/external layers. Open it directly in a browser (GitHub won't render HTML inline); redeploy the matching Claude artifact to update it, then copy the file back here.
