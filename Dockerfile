# syntax=docker/dockerfile:1

# ---- Etapa 1: compilar TypeScript ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts evita compilar sqlite3, que es nativo y sólo lo usan los
# tests: así la imagen de build no necesita python/make/g++.
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Etapa 2: imagen de producción ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Sólo dependencias de producción, instaladas de cero: la imagen final nunca
# contuvo las devDependencies (en vez de tenerlas y borrarlas después).
# Ninguna dependencia de runtime es nativa, así que --ignore-scripts es seguro.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Usuario sin privilegios: si alguien explotara la app, no obtiene root.
USER node

EXPOSE 3000

# Apunta a /health (liveness), no a /health/detallado: si la base tiene un
# corte breve no queremos que Docker reinicie un contenedor que está sano.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health || exit 1

CMD ["node", "dist/index.js"]
