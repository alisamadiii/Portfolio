# cms-bridge — instructions for AI agents

This package wires an Astro project to a git-based CMS (pages-cms style). If
you are an AI agent working in a project that depends on
`@alisamadiillc/cms-bridge`, this file tells you how to do CMS work correctly.

## The workflow

1. `npx cms-bridge check` — analyzes the project, writes `cms-report.md`
   (self-contained: conventions + fix recipes + item list), exits 1 while work
   remains.
2. `npx cms-bridge init` — automated pass: extracts safe static text into
   `src/data/*.json`, tags elements with `data-cms-field`, merges `.pages.yml`,
   adds the Astro integration. Idempotent — re-run any time.
3. You (the agent) handle whatever init skipped: open `cms-report.md` and work
   through the items using its embedded recipes.
4. Re-run `npx cms-bridge check` after each batch until clean.

## `pages-cms.md` is package-managed

Each project carries a `pages-cms.md` (in `docs/`, `marketing/docs/`, wherever)
that documents the `.pages.yml` conventions. It is **synced from this package**
by `npx cms-bridge init` — the content between the
`<!-- cms-bridge:managed:start -->` / `:end` markers is canonical and gets
overwritten on every sync. Never hand-edit inside the markers. Project-specific
notes (a "This site's content model" section, per-client quirks) go **outside**
the markers and are preserved across syncs. To change the canonical text, edit
`docs/pages-cms.md` in the cms-bridge package, publish, and re-run init.

## The contract

Read `conventions.md` in this directory — it is the full conventions contract
(also embedded in every `cms-report.md`). The one-line version: **the JSON key
path, the `.pages.yml` field path, and the `data-cms-field` attribute value are
always the same string.**

Hard rules you must never break:

- Never rename or renumber an existing `data-cms-field` path, JSON key, or
  `.pages.yml` field. The CMS and saved drafts reference them.
- Only add; never delete or restructure existing content shapes.
- `src/data/seo.ts` is per-client identity config, NOT CMS content. Leave it.
- The `site` entry (`src/data/site.json`) is mandatory, listed first in
  `.pages.yml` content, and uses bare field paths on every page.

## Collections ("database tables")

New structured content types (newsletters, jobs, testimonials…) are defined
declaratively — see `collections.md`. Short version: create
`cms/collections/<name>.yml` with `label` + `fields`, then run
`npx cms-bridge collections`. Never hand-edit a collection entry into
`.pages.yml` — write the definition file and sync.
