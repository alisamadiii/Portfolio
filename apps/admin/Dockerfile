# syntax=docker/dockerfile:1
# Self-hosted (Coolify) build for the `admin` app. Build context = monorepo ROOT.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# 1. Prune workspace to just this app + its dependency graph
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.6 prune admin --docker

# 2. Install (cached on lockfile) then build via turbo (^build compiles tsup packages first)
FROM base AS builder
COPY --from=pruner /app/out/json/ .
# --ignore-scripts: out/json has no src yet, so lifecycle scripts like
# api-client's `prepare` (tsup) would fail; turbo ^build compiles them later.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=turbo-admin,target=/app/.turbo \
    --mount=type=cache,id=next-admin,target=/app/apps/admin/.next/cache \
    pnpm turbo build --filter=admin

# 3. Minimal runtime from Next standalone output
FROM base AS runner
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
