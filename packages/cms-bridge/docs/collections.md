# Collections — declarative content types

A collection is a folder of structured entries (newsletters, jobs,
testimonials…) shown as a table in the CMS. Collections are defined as files in
the client project and synced — never hand-edited into `.pages.yml`.

## Define

Create `cms/collections/<name>.yml`. The filename becomes the collection name.
The file body IS the `.pages.yml` entry body — any entry key is allowed;
`name` and `type: collection` are injected for you, and defaults fill in
anything you omit:

```yaml
# cms/collections/newsletters.yml
label: Newsletters
description: Email newsletters — drafts and archive.
fields:
  - { name: title, label: Title, type: string, required: true }
  - { name: date, label: Date, type: date }
  - { name: excerpt, label: Excerpt, type: text }
  - { name: body, label: Body, type: rich-text }
```

Defaults when omitted:

| key            | default                                              |
| -------------- | ---------------------------------------------------- |
| `path`         | `src/data/<name>`                                    |
| `format`       | `json`                                               |
| `filename`     | `{year}-{month}-{day}-{fields.<primary>}.json`       |
| `view.primary` | field named `title`, else the first non-object field |

`view.primary` is the column shown as the table's title in the CMS.

## Sync

```sh
npx cms-bridge collections            # upsert into .pages.yml, create dirs
npx cms-bridge collections --sample   # also write one sample entry (only when empty)
npx cms-bridge collections --dry-run
```

Sync is append-only: existing entries/fields in `.pages.yml` are never
modified — your manual edits win. Entries land under a `Collections` group in
the sidebar. Deleting a definition file does NOT delete the entry (reported as
an orphan instead).

## Consume in Astro

Collection entries are plain JSON files — load them with `import.meta.glob`:

```astro
---
const posts = Object.values(
  import.meta.glob("../data/newsletters/*.json", { eager: true })
).filter((entry) => !entry.default?.draft);
---
{posts.map((post) => <article><h2>{post.default.title}</h2></article>)}
```
