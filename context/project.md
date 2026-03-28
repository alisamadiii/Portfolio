# Project Context — Ali's Personal Monorepo

## What this is

Ali's personal monorepo — a **Turborepo** workspace containing all of his public-facing projects, shared packages, and internal tooling. This is not a client template; it's Ali's own business and portfolio infrastructure.

## Deployment

- **Host:** Vercel (per-app deployments)
- **DB:** Neon (PostgreSQL, serverless) — shared via `@workspace/drizzle`
- **Package manager:** pnpm (workspace)
- **Build system:** Turborepo

## Monorepo structure

```
apps/
  admin/       — internal admin panel
  agency/      — Ali's agency website
  docs/        — documentation site
  motion/      — motion/animation showcase
  portfolio/   — Ali's personal portfolio
  template/    — reusable client template (for new client deployments)

packages/
  auth/              — @workspace/auth — Better Auth config (shared)
  drizzle/           — @workspace/drizzle — Drizzle ORM schema + client (shared)
  email/             — @workspace/email — email templates + sending (shared)
  trpc/              — @workspace/trpc — tRPC router definitions (shared)
  ui/                — @workspace/ui — shadcn/ui component library (shared)
  eslint-config/     — @workspace/eslint-config — shared ESLint config
  typescript-config/ — @workspace/typescript-config — shared tsconfig presets
```

## Tech Stack

| Layer         | Tech                            |
| ------------- | ------------------------------- |
| Framework     | Next.js (App Router, Turbopack) |
| Language      | TypeScript 5                    |
| Styling       | Tailwind CSS 4 + shadcn/ui      |
| API           | tRPC 11                         |
| Data fetching | TanStack React Query 5          |
| ORM           | Drizzle ORM                     |
| Database      | Neon PostgreSQL                 |
| Auth          | Better Auth                     |
| Validation    | Zod 4                           |
| Forms         | React Hook Form                 |
| Build system  | Turborepo                       |

## Key scripts (run from repo root)

- `pnpm build` — build all apps via Turborepo
- `pnpm dev` — dev all apps in parallel
- `pnpm typecheck` — type-check all packages
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:push` — push schema to DB (Ali runs this manually)
- Always use `pnpm`, never `npm` or `yarn`

## Shared packages — how to use

- Import shared UI: `@workspace/ui`
- Import DB client/schema: `@workspace/drizzle`
- Import auth config: `@workspace/auth`
- Import tRPC: `@workspace/trpc`
- Import email: `@workspace/email`

Each app's `package.json` declares workspace dependencies with `"workspace:*"`.

## Per-app structure (Next.js apps)

```
app/
  (auth)/        — sign-in, sign-up, etc.
  (posts)/       — blog/content pages
  admin/         — admin panel (users, products, orders, overview)
  api/           — API route handlers
  settings/      — user settings
  page.tsx       — root page

components/
  admin/         — admin-specific components
  auth/          — auth forms/UI
  landing-page/  — landing page sections
  settings/      — settings UI
  ui/            — local shadcn overrides (prefer @workspace/ui)
  data-table.tsx — shared DataTable (always use this for lists)
  navbar.tsx     — top nav
  footer.tsx     — footer
```

## Adding backend logic

New data requirements → add a procedure in the app's tRPC router (or `@workspace/trpc` if shared). Use `adminProcedure` for admin-only routes. Never fetch directly from a component.
