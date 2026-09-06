# syntax=docker/dockerfile:1
# Self-hosted (Coolify) build for the `motion` app. Build context = monorepo ROOT.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# 1. Prune workspace to just this app + its dependency graph
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.6 prune motion --docker

# 2. Install (cached on lockfile) then build via turbo (^build compiles tsup packages first)
FROM base AS builder
COPY --from=pruner /app/out/json/ .
# --ignore-scripts: out/json has no src yet, so lifecycle scripts like
# package `prepare` scripts (tsup) would fail; turbo ^build compiles them later.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
# `motion` build runs script/get-codes.ts which reads sources from Postgres,
# so DATABASE_URL must be present at BUILD time (Coolify: mark it "Build Variable").
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN --mount=type=cache,id=turbo-motion,target=/app/.turbo \
    --mount=type=cache,id=next-motion,target=/app/apps/motion/.next/cache \
    pnpm turbo build --filter=motion

# 3. Minimal runtime from Next standalone output
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/motion/.next/standalone ./
COPY --from=builder /app/apps/motion/.next/static ./apps/motion/.next/static
COPY --from=builder /app/apps/motion/public ./apps/motion/public
EXPOSE 3000
CMD ["node", "apps/motion/server.js"]
