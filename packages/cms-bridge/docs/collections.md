# Collections (v2)

Structured, repeating content — blog posts, newsletters, jobs, team members,
partners, testimonials. Declared in `src/data/cms.json`, edited from the CMS
collection table.

## Two kinds — the `path` decides

The `path` of a collection is the entire contract for how it's stored:

| `path` value                          | Kind          | Storage                          |
| ------------------------------------- | ------------- | -------------------------------- |
| ends in `.json` (a **file**)          | **array**     | one file: `[ {item}, … ]`        |
| a **directory**                       | **directory** | one file per entry inside it     |

Keep `src/data/` to the three core files (`cms.json`, `pages.json`,
`site.json`) — array-collection files live in `src/data/collections/` (e.g.
`src/data/collections/team.json`). Directory collections can live wherever
(`src/data/blog`, `src/content/…`).

- **Array collection** (`"path": "src/data/collections/team.json"`) — the whole collection
  is a single JSON array file, edited as one draft and published as one commit,
  exactly like `pages.json` / `site.json`. **Order is array position** — reorder
  moves the item in the array; there is no `sort_order` field. Use this for data
  lists (team, partners, workshops, resources, …). No `route`, no `body`.
- **Directory collection** (`"path": "src/data/blog"`) — one file per entry, so
  each entry can have a `{slug}` route and a Markdown `body`. Use this for
  routed / long-form content (blog, stories).

Prefer **array** for anything that's just a list of records. Reach for
**directory** only when entries need their own URL or a Markdown body.

## Declaring a collection

Add an entry to `collections` in `cms.json`.

**Array collection** (the default for data lists):

```json
{
  "name": "team",
  "path": "src/data/collections/team.json",
  "fields": [
    { "name": "name", "type": "string", "required": true },
    { "name": "role", "type": "string" },
    { "name": "image", "type": "image", "required": true }
  ]
}
```

**Directory collection** (routed / Markdown):

```json
{
  "name": "blog",
  "path": "src/data/blog",
  "route": "/blog/{slug}",
  "format": "md",
  "fields": [
    { "name": "title", "type": "string", "required": true },
    { "name": "date", "type": "date", "required": true },
    { "name": "banner", "type": "image" }
  ]
}
```

- `name` — unique id; also the collection's label (Title Case) unless `label`
  is set.
- `path` — a `.json` **file** (array collection) or a **directory** (directory
  collection). This choice is the whole storage contract (see above).
- `format` — directory collections only: `"md"` (Markdown, default) or
  `"json"`. Ignored for array collections (always JSON).
- `route` — directory collections only; with `{slug}` gives each entry a canvas
  tile at that URL. Array collections have no per-item route.
- `fields` — drives the create dialog and table columns. Types: `string`,
  `text`, `image`, `date`, `boolean`, `number`, `select` (`options: [...]`).
  Directory collections also get a `body` field for long/Markdown content;
  array collections do **not** (and never need a `sort_order` field — order is
  the array's own order).

## Array collection file

The whole collection is one JSON array. Order top-to-bottom is display order:

```json
[
  { "name": "Executive Director", "role": "…", "image": "/media/a.jpg" },
  { "name": "Programs Lead", "role": "…", "image": "/media/b.jpg" }
]
```

The site imports the file directly and renders it in order — no sort step:

```ts
import team from "../data/collections/team.json";
```

## Directory entry files

Markdown entry (`format: "md"`) — frontmatter + body:

```md
---
title: Choosing Your Wood
date: 2026-06-22
excerpt: A quick guide to the three woods we burn.
banner: /media/wood.jpg
---

Body content here…
```

JSON entry (`format: "json"`) — one object per file, `body` as a field.

The CMS reads the folder by `path` and edits/creates entries; the site reads
the same folder however it prefers (Astro content collections, an
`import.meta.glob`, etc.). Filenames default to
`{year}-{month}-{day}-{title}.{ext}` on create.

That's the whole collections model — declare fields in `cms.json`; the `path`
picks array-file vs directory storage. No separate schema, no sync step.

## Migrating a directory JSON collection to an array

If a collection is a directory of one-JSON-file-per-entry, convert it to a
single array file:

```sh
npx cms-bridge collections-to-array --dry-run   # preview
npx cms-bridge collections-to-array             # convert + rewrite cms.json
```

It reads every entry (ordered by the old `sort_order`), strips that field,
writes the ordered array to `src/data/collections/<name>.json`, updates the
`cms.json` `path`, and deletes the directory. Markdown / routed directories are
left untouched. Afterwards, point the site's loader at the array file
(`import data from "../data/collections/<name>.json"`) and run
`cms-bridge check`.
