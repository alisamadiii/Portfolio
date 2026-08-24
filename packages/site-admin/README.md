# @alisamadiillc/site-admin

Self-hosted `/admin` for client sites. WordPress-style content forms over the
cms-bridge v2 JSON contract (`src/data/cms.json` / `pages.json` /
`variables.json` / `seo.json` + array collections). Clerk (GitHub-only) login;
every save is an atomic commit to the site's own GitHub repo **authored by the
signed-in user's own GitHub token** — no external dashboard, database, or
server-held credential in the publish path. If the repo, the user's GitHub
account, and the Clerk project exist, editing works.

## How it survives the agency

- The site is static; `/admin` + its API are the only SSR routes.
- Auth is a Clerk project **owned by the client** (created with their email).
- Commits use the editor's own GitHub OAuth token (Clerk GitHub provider,
  `repo` scope). Repo write access on GitHub *is* the permission model — to add
  an editor, add a GitHub collaborator.
- Hosting rebuilds on push, exactly like any other commit.

## Astro setup

```bash
pnpm add @alisamadiillc/site-admin @astrojs/react react react-dom
```

The site needs an SSR adapter (`@astrojs/vercel`, `@astrojs/cloudflare`, or
`@astrojs/node`) with static-by-default output — only the admin routes opt out
of prerendering.

Two files:

```ts
// src/pages/api/admin/[...path].ts
import { createAstroAdminHandler } from "@alisamadiillc/site-admin/astro";

export const prerender = false;
export const ALL = createAstroAdminHandler();
```

```astro
---
// src/pages/admin/[...path].astro
import Admin from "@alisamadiillc/site-admin/astro/Admin.astro";
export const prerender = false;
---

<Admin siteName="Client Name" />
```

Three env vars:

```bash
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
ADMIN_GITHUB_REPO=owner/name
# optional — defaults to the repo's default branch
ADMIN_GITHUB_BRANCH=main
```

## Clerk project setup (per client, once)

1. Create the Clerk application **with the client's email account**.
2. Enable **only** the GitHub social provider.
3. In the GitHub provider settings, request the `repo` scope and enable
   *"Use custom credentials"* if you need commits attributed via a dedicated
   GitHub OAuth app.
4. Copy the publishable + secret keys into the site's hosting env.

Editors sign in with GitHub; anyone with **write access to the repo** can edit.
Read-only or no access → the API refuses with a clear message.

## API

`@alisamadiillc/site-admin/core` — framework-agnostic:

- `createAdminHandler(config)` → `(request: Request) => Promise<Response>`
  - `GET  {basePath}/manifest`
  - `GET  {basePath}/content?path=src/data/pages.json`
  - `POST {basePath}/content` `{ path, sha, contentObject, message?, force? }`
- `commitFilesAtomic`, `createOctokit`, `checkRepoAccess`, `readJsonFile`
- form-schema helpers: `inferFields`, `collectionField`, `getAtPath`, `setAtPath`

`@alisamadiillc/site-admin/react` — `<AdminApp publishableKey apiBase siteName siteUrl />`

`@alisamadiillc/site-admin/astro` — `createAstroAdminHandler()`, plus the
drop-in page at `@alisamadiillc/site-admin/astro/Admin.astro`.

Next.js adapter: planned (`/next`).

## Conflict model

Saves send the base blob sha. If the file changed on GitHub since load, the
server answers `409 { status: "conflict" }` and the UI offers *reload* or
*save anyway* (`force: true`). The commit itself is atomic (Git Data API, one
tree/one commit, non-forced ref update).
