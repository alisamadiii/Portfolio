# syntax=docker/dockerfile:1
# Self-hosted (Coolify) build for the `client-websites` viewer. Build context = monorepo ROOT.
# One Node process: the Hono server serves the built Vite app, the /api routes
# and the client sites streamed out of R2.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# 1. Prune workspace to just this app + its dependency graph
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.6 prune client-websites --docker

# 2. Install (cached on lockfile) then build via turbo
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=turbo-client-websites,target=/app/.turbo \
    pnpm turbo build --filter=client-websites

# 3. Node runtime — the server runs from source via tsx, so it needs node_modules
FROM base AS runner
ENV NODE_ENV=production PORT=3027
WORKDIR /app
COPY --from=builder /app ./
WORKDIR /app/apps/client-websites
EXPOSE 3027
CMD ["node", "--import", "tsx", "server/index.ts"]
