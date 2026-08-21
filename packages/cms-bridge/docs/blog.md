# Hub Blog Sync

Blog posts are **edited in the hub, not in the repository**. They live in the
hub database (`hub_blog_post`) and are mirrored into the client repo's
`src/content/blog/` as markdown files by a GitHub Action whenever someone
clicks **Publish to site** in the hub (Site Settings › Blog).

```
Hub Blog tab ──save──> hub database (drafts)
      │ Publish to site
      └─> repository_dispatch "blog-sync" on the client repo
            └─> .github/workflows/blog-sync.yml
                  └─> node .github/scripts/blog-sync.mjs
                        ├─ GET https://api.alisamadii.com/v1/content/blog?repoId=<id>
                        ├─ mirror src/content/blog/ (write changed, delete stale)
                        └─ commit + push  →  Vercel auto-deploys
```

## Setup (once per client repo)

```sh
npx cms-bridge blog --repo-id <github-repo-id>
```

This scaffolds:

- `.github/workflows/blog-sync.yml` — runs on `repository_dispatch`
  (type `blog-sync`) and `workflow_dispatch` (manual runs from the Actions tab)
- `.github/scripts/blog-sync.mjs` — dependency-free mirror script with the
  repo id stamped into the content API URL
- `src/content/blog/` — the target directory

Then:

1. Add the printed `blog` collection to `src/content.config.ts`.
2. Build the blog pages (listing + `[slug]`) if the site doesn't have them.
3. Commit and push to the **default branch** — `repository_dispatch` only
   triggers workflows that exist there.

No secrets are needed: the content API is public and serves **published posts
only** (drafts never leave the hub).

## Rules

- The sync is a **mirror**: manual edits to files in `src/content/blog/` are
  overwritten on the next publish, and files without a matching hub post are
  deleted. Blog content is edited in the hub only.
- Markdown files are fully rendered by the API (frontmatter escaping is
  handled server-side); the script writes them verbatim.
- Frontmatter fields: `title`, `description`, `publishDate`, `updatedDate?`,
  `coverImage?`, `coverImageAlt?`, `tags`.
- Pushes made with the default `GITHUB_TOKEN` do **not** trigger other
  workflows — and in practice they do **not** trigger the Vercel git
  integration either (verified: the bot commit lands, no deployment is
  created). To get automatic Vercel deploys, add a `BLOG_SYNC_TOKEN` secret
  (fine-grained PAT with Contents read/write on the client repos — an
  org-level secret covers every client repo at once). The workflow's checkout
  uses `token: ${{ secrets.BLOG_SYNC_TOKEN || github.token }}`, so the push
  then counts as a normal user push and Vercel deploys it. Without the
  secret, the sync still commits — you just have to trigger the deploy
  yourself.

## Cost

The sync job takes well under a minute of Actions time per publish. Private
repos consume from the org's shared free pool (2,000 min/month on the Free
plan) — negligible at any realistic publish frequency.

## Write a post locally

```
npx @alisamadiillc/cms-bridge blog new "My post title"
```

Creates `src/content/blog/my-post-title.md` with the hub-contract frontmatter
(`title`, `description`, `publishDate` = today, `coverImage`, `coverImageAlt`,
`tags`) so you can start typing immediately. Refuses to overwrite an existing
file (`--force` to overwrite).

If the repo's blog is managed by the hub, import the finished post into the
hub before publishing — the sync mirror overwrites and deletes local posts it
doesn't know about.
