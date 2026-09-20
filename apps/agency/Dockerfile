# syntax=docker/dockerfile:1
# Self-hosted (Coolify) build for the `agency` Astro site. Build context = monorepo ROOT.
# Marketing pages are prerendered to static files; the @astrojs/node standalone
# server serves them plus the on-demand /[slug] shortener redirect.
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

# 3. Node runtime — the standalone server needs the built output + node_modules
FROM base AS runner
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3004
WORKDIR /app
COPY --from=builder /app ./
WORKDIR /app/apps/agency
EXPOSE 3004
CMD ["node", "./dist/server/entry.mjs"]
