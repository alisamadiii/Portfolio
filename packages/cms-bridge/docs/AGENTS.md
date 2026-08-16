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

- **New site** — build pages with the bridge components, put content in the
  three files, add `cmsBridge()` to `astro.config.mjs`. Run
  `npx cms-bridge check` and fix what it flags.
- **Migrate a legacy `.pages.yml` site** — `npx cms-bridge migrate` generates
  `cms.json` + `pages.json` and rewires imports; then rewrite key sections with
  components. `--delete-legacy` once the canvas round-trips.
- **`npx cms-bridge check`** — validates the v2 contract (manifest shape,
  page/site key collisions, every `data-cms-field` resolves to a value). Run it
  until clean.

## `pages-cms.md` is package-managed

Each project carries a `pages-cms.md` (in `docs/`, `marketing/docs/`, wherever)
documenting the CMS contract. It is **synced from this package** by
`npx cms-bridge init` — content between the `<!-- cms-bridge:managed:start -->`
/ `:end` markers is canonical and overwritten on every sync. Never hand-edit
inside the markers; project-specific notes go **outside** them. To change the
canonical text, edit `docs/pages-cms.md` in the cms-bridge package, publish, and
re-run init.

## Hard rules you must never break

- Never rename or renumber an existing `data-cms-field` path or JSON key — the
  CMS and saved drafts reference them.
- Only add; never delete or restructure existing content shapes.
- `src/data/seo.ts` is per-client identity config, NOT CMS content. Leave it.
- `src/data/site.json` is mandatory and uses bare field paths on every page.

## Collections

New structured content types (blog, newsletters, jobs…) are declared in
`cms.json` under `collections` — see `collections.md`. Fields there drive the
CMS table and create dialog; entries are Markdown (or JSON) files in the
collection's `path`.
