ARG NODE_VERSION
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app
RUN npm install -g yarn@1.22.22
COPY package.json yarn.lock ./
COPY apps/backend/package.json apps/backend/package.json

FROM base AS dev
RUN yarn install
COPY . .
WORKDIR /app/apps/backend
CMD ["yarn", "dev"]

FROM base AS build
RUN yarn install
COPY . .
RUN yarn workspace backend build

FROM node:${NODE_VERSION}-slim AS production
WORKDIR /app
RUN npm install -g yarn@1.22.22
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
RUN yarn install --production
CMD ["node", "dist/index.js"]
