# syntax=docker/dockerfile:1
# Self-hosted (Coolify) build for the `leads` app. Build context = monorepo ROOT.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# 1. Prune workspace to just this app + its dependency graph
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.6 prune leads --docker

# 2. Install (cached on lockfile) then build via turbo (^build compiles tsup packages first)
FROM base AS builder
# NEXT_PUBLIC_* is inlined into the client bundle at build time — the tRPC
# React client reads it in the browser, so a runtime env var is not enough.
ARG NEXT_PUBLIC_API_URL=https://api.alisamadii.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=pruner /app/out/json/ .
# --ignore-scripts: out/json has no src yet, so lifecycle scripts like
# package `prepare` scripts (tsup) would fail; turbo ^build compiles them later.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=turbo-leads,target=/app/.turbo \
    --mount=type=cache,id=next-leads,target=/app/apps/leads/.next/cache \
    pnpm turbo build --filter=leads

# 3. Minimal runtime from Next standalone output
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/leads/.next/standalone ./
COPY --from=builder /app/apps/leads/.next/static ./apps/leads/.next/static
EXPOSE 3000
CMD ["node", "apps/leads/server.js"]
