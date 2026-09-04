#!/bin/sh
# One-time setup: get the backend ready to run, without actually starting it
# (that's still `yarn backend:dev`, separately). Safe to re-run -- every
# step here is a no-op or idempotent if you've already run it before.
set -e

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env already exists, leaving it as is."
else
  cp .env.example .env
  echo "Created .env from .env.example -- fill in the real secrets (Google OAuth, BETTER_AUTH_SECRET) before running the backend."
fi

echo "Installing workspace dependencies..."
yarn install

echo "Regenerating Better Auth's schema (auth-schema.ts) from backend/src/auth.ts..."
# Neither this nor db:generate below need a live DB connection or real
# secrets in .env -- both just introspect source/schema files and write
# output files. Runs directly on the host (not via Docker) since yarn
# install above already put backend's devDependencies in the hoisted root
# node_modules.
yarn workspace backend db:auth:generate

echo "Generating any pending migrations from schema changes..."
yarn workspace backend db:generate

echo "Starting postgres and applying migrations..."
# `docker compose run` starts postgres too (it's backend's depends_on) and
# waits for its healthcheck, same as `up` would. Overriding the command to
# just `yarn db:migrate` runs the same migration step the dev container's
# CMD runs on every boot, then exits instead of also starting the server.
# This one does need a live DB, hence Docker: same network as postgres,
# same DATABASE_URL from .env as the real dev container uses.
NODE_VERSION=$(cat .node-version) docker compose run --rm --build backend yarn db:migrate

echo
echo "Backend initialized. Run 'yarn backend:dev' to start it."
