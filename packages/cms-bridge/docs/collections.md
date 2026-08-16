# Collections (v2)

Structured, repeating content — blog posts, newsletters, jobs, testimonials.
Declared in `src/data/cms.json`; entries are files on disk, edited from the CMS
collection table.

## Declaring a collection

Add an entry to `collections` in `cms.json`:

```json
{
  "collections": [
    {
      "name": "blog",
      "path": "src/data/blog",
      "route": "/blog/{slug}",
      "format": "md",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "date", "type": "date", "required": true },
        { "name": "excerpt", "type": "text" },
        { "name": "banner", "type": "image" }
      ]
    }
  ]
}
```

- `name` — unique id; also the collection's label (Title Case) unless `label`
  is set.
- `path` — folder holding the entry files (e.g. `src/data/blog`).
- `format` — `"md"` (Markdown: frontmatter + body, the default) or `"json"`.
- `route` — with `{slug}` gives each entry a canvas tile at that URL; omit for
  a non-routed list.
- `fields` — drives the create dialog and table columns. Types: `string`,
  `text`, `image`, `date`, `boolean`, `number`, `select` (`options: [...]`).
  A `body` field is always available for the long/Markdown content.

## Entry files

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

That's the whole collections model — declare fields in `cms.json`, entries are
files. No separate schema, no sync step.
