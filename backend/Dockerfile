ARG NODE_VERSION
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
RUN npm install -g yarn@1.22.22
COPY package.json yarn.lock ./
COPY backend/package.json backend/package.json
# email-templates is a real runtime dependency of backend (see
# email/templates.ts) -- its package.json needs to be present for `yarn
# install` below to recognize it as a local workspace member. Without this,
# yarn would go looking for "email-templates" on the public npm registry,
# where a real, unrelated package with that exact name already exists.
COPY email-templates/package.json email-templates/package.json

FROM base AS dev
RUN yarn install
COPY . .
WORKDIR /app/backend
# Migrations run on every boot so a fresh/updated DB is never a separate
# manual step -- db:generate/db:auth:generate stay manual (they're
# schema-authoring steps that need a human to review the output).
#
# email-templates is built on every boot too, but for a different reason:
# it's a real runtime dependency (email/templates.ts imports its compiled
# dist/), and dist/ is gitignored like every other workspace's build
# output -- a fresh clone has none on the host at all. docker-compose.dev.yml
# bind-mounts the whole repo over /app at container start, shadowing
# anything built during `docker build` (see base stage), so this can't run
# there either -- it has to happen here, at container start, against
# whatever's actually on the host right now. This also means editing a
# template just needs a container restart to take effect, not a separate
# manual build step -- see email-templates/README.md.
CMD ["sh", "-c", "yarn workspace email-templates build && yarn db:migrate && yarn dev"]

FROM base AS build
RUN yarn install
COPY . .
RUN yarn workspace email-templates build
RUN yarn workspace backend build
# A minimal root package.json for the production stage's install below --
# just enough workspace context (backend + the one other workspace it
# actually depends on at runtime) for yarn to resolve "email-templates" as
# the local package it is. Every other workspace (web-app/shared-ui/
# web-static) is irrelevant to backend's own runtime and left out.
RUN node -e "require('node:fs').writeFileSync('prod-package.json', JSON.stringify({ private: true, workspaces: ['backend', 'email-templates'] }))"

FROM node:${NODE_VERSION}-slim AS production
WORKDIR /app
RUN npm install -g yarn@1.22.22
COPY --from=build /app/prod-package.json ./package.json
# yarn.lock too, not just package.json -- otherwise this install has no
# lockfile to pin against and re-resolves versions from package.json's
# semver ranges alone, which can drift from what dev/build actually tested.
COPY --from=build /app/yarn.lock ./yarn.lock
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/email-templates/package.json ./email-templates/package.json
COPY --from=build /app/email-templates/dist ./email-templates/dist
RUN yarn install --production
# --production only controls which package.json entries are resolution
# *roots* -- it doesn't stop a devDependency from being installed anyway
# when its version also happens to satisfy a peerDependency declared by a
# real dependency (drizzle-orm peer-depends on @types/pg; better-auth
# peer-depends on drizzle-kit/vitest -- both npm and yarn do this, it's not
# a flag/tool bug). Nothing at runtime imports our own devDependencies
# regardless of why they got pulled in, so remove them by name explicitly --
# both workspaces' devDependencies, not just backend's own, for the same
# reason.
RUN node -e "const fs = require('node:fs'); const names = new Set(); for (const p of ['./backend/package.json', './email-templates/package.json']) for (const name of Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')).devDependencies ?? {})) names.add(name); for (const name of names) fs.rmSync('node_modules/' + name, { recursive: true, force: true });"
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
