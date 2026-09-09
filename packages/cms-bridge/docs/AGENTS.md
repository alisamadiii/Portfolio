# cms-bridge — instructions for AI agents

This package wires an Astro project to a git-based CMS (v2, schema-less). If you
are an AI agent working in a project that depends on
`@alisamadiillc/cms-bridge`, this file tells you how to do CMS work correctly.
Read `pages-cms.md` for the full guide and `conventions.md` for the contract.

## The model (v2)

Content is **two JSON files at the repo root**:

- `_site.json` — one config file with three keys:
  - `cms` — manifest: `baseUrl`, `pages` (name → route), optional `collections`.
  - `seo` — site + per-page SEO (`site` and `pages.<key>` slices).
  - `variables` — global values reused on every page (name/logo/contact/socials).
- `_pages.json` — all page content, keyed by page name.

Older repos used four files under `src/data/` (`cms.json`, `pages.json`,
`variables.json`, `seo.json`). The hosted CMS now **requires** the root
`_site.json` + `_pages.json` — migrate legacy repos or the CMS won't load them.
(Collection files live under `_collections/` at the repo root, alongside the
root config + page content — the leading underscore groups them together.)

Markup is made editable with the bridge **components**
(`@alisamadiillc/cms-bridge/components`): `Heading1/2/3`, `Text`, `Image`,
`Link`, `Group`/`Item`. Each REQUIRES a `field` prop and reliably becomes
editable on the canvas. Prefer components for anything new; a plain
`data-cms-field` attribute is a supported fallback.

## The workflow

- **`npx cms-bridge init`** — the onboarding scaffold. Installs this skill,
  ensures the config + content files exist (a page object per manifest page),
  creates placeholder files for array collections, and wires the `astro.config`
  integration + `package.json` scripts. Idempotent and add-only — safe to
  re-run. It does not rewrite markup; wiring is done in the canvas editor.
- **`npx cms-bridge check`** — validates the v2 contract (manifest shape,
  page/site key collisions, every `field`/`data-cms-field` resolves to a value)
  and lists any markup still needing wiring. Run it until clean.
- **`npx cms-bridge collection`** — interactively adds an array collection to
  the manifest (`_site.json` → `cms.collections`) and creates its placeholder file.

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
- `_site.json` → `variables` holds global values and uses bare field paths on every page.

## Collections

New structured content types (blog, newsletters, jobs…) are declared in the
manifest (`_site.json` → `cms.collections`) — see `collections.md`. Fields there drive the
CMS table and create dialog; entries are Markdown (or JSON) files in the
collection's `path`.
