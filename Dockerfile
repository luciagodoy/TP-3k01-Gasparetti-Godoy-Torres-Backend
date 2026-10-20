# syntax=docker/dockerfile:1

# Exact Node and Alpine versions: with "node:22-alpine" two builds of the same
# commit could differ. Dependabot (docker ecosystem) proposes the next patch as
# a PR, so the pin does not fall behind with unfixed CVEs.

# ---- Stage 1: compile TypeScript ----
FROM node:22.23.3-alpine3.24 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts skips compiling sqlite3, which is native and only used by
# the tests: this way the build image needs no python/make/g++.
RUN npm ci --ignore-scripts

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: production image ----
FROM node:22.23.3-alpine3.24 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only, installed from scratch: the final image never
# contained the devDependencies (instead of having them and deleting them later).
# No runtime dependency is native, so --ignore-scripts is safe.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Unprivileged user: if someone exploited the app, they would not get root.
USER node

EXPOSE 3000

# Points to /health (liveness), not /health/detailed: a short database outage
# should not make Docker restart a container that is healthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health || exit 1

CMD ["node", "dist/index.js"]
