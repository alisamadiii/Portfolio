# cms-bridge — instructions for AI agents

This package wires an Astro project to a git-based CMS (v2, schema-less). If you
are an AI agent working in a project that depends on
`@alisamadiillc/cms-bridge`, this file tells you how to do CMS work correctly.
Read `pages-cms.md` for the full guide and `conventions.md` for the contract.

## The model (v2)

Content is three JSON files under `src/data/`:

- `cms.json` — manifest: `baseUrl`, `pages` (name → route), optional
  `collections`.
- `pages.json` — all page content, keyed by page name.
- `site.json` — global content (header/footer/identity).

Markup is made editable with the bridge **components**
(`@alisamadiillc/cms-bridge/components`): `Heading1/2/3`, `Text`, `Image`,
`Link`, `Group`/`Item`. Each REQUIRES a `field` prop and reliably becomes
editable on the canvas. Prefer components for anything new; a plain
`data-cms-field` attribute is a supported fallback.

## The workflow

- **`npx cms-bridge init`** — the onboarding pipeline. Installs this skill,
  ensures the three JSON files exist, creates placeholder files for array
  collections, and codemods pages (+ single-use components): it replaces plain
  tags (`h1`/`p`/`img`/`a`/…) with the bridge components and moves their values
  into `pages.json`. Idempotent and add-only — safe to re-run.
- **`npx cms-bridge check`** — validates the v2 contract (manifest shape,
  page/site key collisions, every `field`/`data-cms-field` resolves to a value)
  and lists any markup still needing wiring. Run it until clean.
- **`npx cms-bridge collection`** — interactively adds an array collection to
  `cms.json` (name, label, fields) and creates its placeholder file.

## `pages-cms.md` is package-managed

The full client-site guide lives in `.claude/skills/cms-bridge/pages-cms.md`,
installed by `npx cms-bridge init` from this package. It's overwritten on every
run, so never hand-edit it. To change the canonical text, edit
`docs/pages-cms.md` in the cms-bridge package, publish, and re-run init.

## Hard rules you must never break

- Never rename or renumber an existing `field` / `data-cms-field` path or JSON
  key — the CMS and saved drafts reference them.
- Never nest one `field` / `data-cms-field` element inside another.
- Only add; never delete or restructure existing content shapes.
- `src/data/seo.ts` is per-client identity config, NOT CMS content. Leave it.
- `src/data/site.json` is mandatory and uses bare field paths on every page.

## Collections

New structured content types (blog, newsletters, jobs…) are declared in
`cms.json` under `collections` — see `collections.md`. Fields there drive the
CMS table and create dialog; entries are Markdown (or JSON) files in the
collection's `path`.
