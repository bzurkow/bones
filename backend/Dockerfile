ARG NODE_VERSION
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
RUN npm install -g yarn@1.22.22
COPY package.json yarn.lock ./
COPY backend/package.json backend/package.json

FROM base AS dev
RUN yarn install
COPY . .
WORKDIR /app/backend
# Migrations run on every boot so a fresh/updated DB is never a separate
# manual step -- db:generate/db:auth:generate stay manual (they're
# schema-authoring steps that need a human to review the output).
CMD ["sh", "-c", "yarn db:migrate && yarn dev"]

FROM base AS build
RUN yarn install
COPY . .
RUN yarn workspace backend build

FROM node:${NODE_VERSION}-slim AS production
WORKDIR /app
RUN npm install -g yarn@1.22.22
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./package.json
# yarn.lock too, not just package.json -- otherwise this install has no
# lockfile to pin against and re-resolves versions from package.json's
# semver ranges alone, which can drift from what dev/build actually tested.
COPY --from=build /app/yarn.lock ./yarn.lock
RUN yarn install --production
# --production only controls which package.json entries are resolution
# *roots* -- it doesn't stop a devDependency from being installed anyway
# when its version also happens to satisfy a peerDependency declared by a
# real dependency (drizzle-orm peer-depends on @types/pg; better-auth
# peer-depends on drizzle-kit/vitest -- both npm and yarn do this, it's not
# a flag/tool bug). Nothing at runtime imports our own devDependencies
# regardless of why they got pulled in, so remove them by name explicitly.
RUN node -e "for (const name of Object.keys(require('./package.json').devDependencies ?? {})) require('node:fs').rmSync('node_modules/' + name, { recursive: true, force: true });"
CMD ["node", "dist/index.js"]
