# ---------- build: install all deps, generate Prisma client, compile TS ----------
FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# ---------- migrate: one-shot container that applies Prisma migrations ----------
FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------- runtime: production deps + compiled output only ----------
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated

USER node
EXPOSE 4000
# API by default; override the command with `node dist/src/worker.js` to run only the queue workers.
CMD ["node", "dist/src/server.js"]
