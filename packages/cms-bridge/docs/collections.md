# Collections (v2)

Structured, repeating content — blog posts, newsletters, jobs, team members,
partners, testimonials. **Auto-discovered** by listing the repo-root
`_collections/` folder — nothing is declared in `_site.json`. Edited from the CMS
collection table.

## Discovery — the `_collections/` folder decides

There is no `cms.collections` manifest and no `fields` schema. The CMS lists the
repo-root `_collections/` folder and turns what it finds into collections:

| entry in `_collections/`       | Kind          | Storage                          |
| ------------------------------ | ------------- | -------------------------------- |
| a **subfolder**                | **directory** | one file per entry inside it     |
| a top-level **`.json` file**   | **array**     | one file: `[ {item}, … ]`        |
| a subfolder named **`blog`**   | **blog**      | a directory collection, routed   |

The config + page content live at the repo root (`_site.json`, `_pages.json`),
and collection files live under `_collections/` at the repo root too — the
leading underscore groups them all together. Array collections are `.json` files
(`_collections/team.json`); directory collections are subfolders
(`_collections/blog`, `_collections/…`).

- **Array collection** (`_collections/team.json`) — the whole collection is a
  single JSON array file, edited as one draft and published as one commit,
  exactly like `_pages.json`. **Order is array position** — reorder moves the
  item in the array; there is no `sort_order` field. Use this for data lists
  (team, partners, workshops, resources, …). No route, no `body`.
- **Directory collection** (`_collections/blog`) — one file per entry, so each
  entry can have a `{slug}` route and a Markdown `body`. Use this for routed /
  long-form content (blog, stories).

Prefer **array** for anything that's just a list of records. Reach for
**directory** only when entries need their own URL or a Markdown body.

## Adding a collection

Nothing to declare — just **drop a folder or a `.json` file** into
`_collections/` and it appears in the CMS automatically.

- **Array collection** (the default for data lists): create the file
  `_collections/team.json` holding a JSON array (start with `[]` or a couple of
  seed items).
- **Directory collection** (routed / Markdown): create the folder
  `_collections/blog/` and add entry files inside it. A subfolder literally named
  `blog` is treated as the blog (routed at `/blog/{slug}`).

The collection's **name** is the folder or file name (`team`, `blog`); its label
is that name in Title Case.

## Fields are inferred from the entry — no `fields` declaration

There is no `fields` list anywhere. The CMS reads an entry's JSON and infers the
editor from its shape:

- an **array** value → a repeatable list of items (add / remove / reorder),
- a **nested object** → a nested group of fields,
- a `YYYY-MM-DDTHH:MM` string → a datetime picker,
- other scalars → the matching text / number / boolean / image control.

So the entry JSON *is* the schema. To add a field to a collection, add the key
to its entries; to change a field's editor, change the value's shape.

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
import team from "../../_collections/team.json";
```

## Directory entry files

Markdown entry (Markdown collection) — frontmatter + body:

```md
---
title: Choosing Your Wood
date: 2026-06-22
excerpt: A quick guide to the three woods we burn.
banner: /media/wood.jpg
---

Body content here…
```

JSON entry — one object per file, `body` as a field.

The CMS reads the folder and edits/creates entries; the site reads the same
folder however it prefers (Astro content collections, an `import.meta.glob`,
etc.). Filenames default to `{year}-{month}-{day}-{title}.{ext}` on create.

That's the whole collections model — a folder or `.json` file in `_collections/`
is the collection; its entries' JSON is the schema. No manifest, no `fields`, no
sync step.

## Empty collections — `.template.json`

An empty collection has two problems: git won't track an empty folder (so it
isn't discovered), and with no entry there's nothing to infer the New-entry
inputs from (the form falls back to a bare `title` + `body`). Fix both with an
optional **`.template.json`** in the collection folder — one example object
shaped like an entry:

```json
// _collections/newsletters/.template.json
{
  "title": "",
  "slug": "",
  "excerpt": "",
  "cover_image_url": "https://example.com/cover.webp",
  "created_at": "2026-01-01",
  "published": false
}
```

Because it's a dotfile the site never renders it (excluded from `**/*.md` /
`**/*.json` globs) and the CMS never lists it as an entry. It only (a) keeps the
folder git-tracked so the collection is discovered, and (b) seeds the New-entry
form's fields — inferred from its shape, values start blank. Once a real entry
exists, that entry drives the form and the template is ignored.

## Migrating a directory JSON collection to an array

If a collection is a directory of one-JSON-file-per-entry, convert it to a
single array file:

```sh
npx cms-bridge collections-to-array --dry-run   # preview
npx cms-bridge collections-to-array             # convert
```

It reads every entry (ordered by the old `sort_order`), strips that field,
writes the ordered array to `_collections/<name>.json`, and deletes the
directory — the collection stays discovered under its new file. Markdown /
routed directories are left untouched. Afterwards, point the site's loader at
the array file (`import data from "../../_collections/<name>.json"`) and run
`cms-bridge check`.
