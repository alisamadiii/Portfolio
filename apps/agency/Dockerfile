# syntax=docker/dockerfile:1
# Self-hosted (Coolify) build for the `agency` Astro static site. Build context = monorepo ROOT.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# 1. Prune workspace to just this app + its dependency graph
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.6 prune agency --docker

# 2. Install (cached on lockfile) then build via turbo
FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=turbo-agency,target=/app/.turbo \
    pnpm turbo build --filter=agency

# 3. nginx serves the static dist
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/agency/dist /usr/share/nginx/html
COPY apps/agency/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
