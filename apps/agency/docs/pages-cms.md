# Pages CMS — `.pages.yml` conventions

This documents the **CMS-specific conventions** the Pages CMS understands in a
site's `.pages.yml`. The CMS renders special UI when it sees these, so the config
must follow the exact shapes below.

> **Maintainers:** update this file whenever a new CMS feature/skill is added, so
> the AI editing a `.pages.yml` knows the syntax for it. This is the canonical
> reference — keep it in sync with the CMS.

The special-UI conventions this fork adds are documented in their own sections
below (typed inputs, `seo`, live preview, groups). First, the general reference for
authoring any `.pages.yml` — **content entries** and the **field system**.

---

## Content entries — `content`

`content` is an array of entries. Each entry is one of three `type`s: **`file`** (one
editable file), **`collection`** (a folder of like files), or **`group`** (sidebar
folder only — see [Sidebar grouping](#sidebar-grouping--type-group-in-content)).

### `type: file`

One document, one form.

```yaml
- name: home # unique id, ^[a-zA-Z0-9-_]+$ (also the preview route key)
  label: Home # sidebar label
  description: Landing page # optional
  type: file
  path: src/data/home.json # relative, no leading/trailing slash
  format: json # usually inferred from the extension — see Formats
  fields: [...] # the form (see Field reference)
```

### `type: collection`

A folder of same-shaped entries (blog posts, team members, projects). The client gets
a **list view** plus create/edit/delete.

```yaml
- name: posts
  label: Blog
  type: collection
  path: src/content/blog # the folder
  format: yaml-frontmatter # e.g. Markdown + frontmatter
  filename: "{year}-{month}-{day}-{primary}.md" # new-file name template
  exclude: ["_drafts/**"] # optional globs to hide
  subfolders: false # optional — flatten nested folders (default true)
  view: # optional list-view config
    layout: list # "list" (default) or "tree" (nested folders)
    fields: [title, date] # columns shown
    primary: title # the entry's display field
    sort: [date, title] # sortable columns
    search: [title] # searchable fields
    default: { sort: date, order: desc }
    reorder: sort_order # optional — drag-to-reorder, names a number field (see Ordering)
  operations: { create: true, rename: true, delete: true } # optional gating
  fields: [...]
```

> **Gotcha:** the collection list only shows files whose extension matches the
> `filename` template's extension. The default template ends in `.md`, so a
> `format: json` collection shows "No entries" unless you set e.g.
> `filename: "{primary}.json"`.

**Filename templates** (collections) use tokens expanded at create time: `{year}`
`{month}` `{day}` `{hour}` `{minute}` `{second}`, `{primary}` (alias `{slug}` — the
primary field, slugified), `{fields.<name>}` / `{<name>}` (any field, slugified). Give
`filename` as an object to also expose the name as an editable field:
`filename: { template: "{primary}.md", field: true }` (`field: "create"` = editable only
when creating).

Other entry keys: `delimiters` (frontmatter delimiter override), `commit`
(`{ templates?, identity? }` — custom commit messages / author), `format: raw` (edit the
file body as-is with no field parsing).

### Ordering

How entry order works, end to end:

**1. List-view sorting (display only).** `view.sort` lists the sortable columns;
`view.default: { sort, order }` sets the initial sort. Without a default the CMS
falls back to a `date` field if one exists, else the primary field. Sorting the
list does **not** change any files.

**2. Manual ordering — drag-to-reorder (`view.reorder`).** Set `view.reorder`
to the name of a **`type: number` field** (convention: `sort_order`, make it
`required: true`) and the collection list becomes drag-sortable:

```yaml
- name: team
  type: collection
  path: src/content/team
  format: json
  filename: "{primary}.json"
  view:
    fields: [name, role]
    primary: name
    reorder: sort_order
  fields:
    - { name: name, label: Name, type: string, required: true }
    - { name: sort_order, label: Sort order, type: number, required: true }
```

Behavior:

- A grip-handle column appears and the list default-sorts by the field ascending
  (all entries on one page).
- Dropping a row rewrites the field to `0..n-1` across the entries whose value
  changed — **one commit** for the whole reorder. Gaps, duplicates, or missing
  values self-heal on the first drag.
- Dragging is disabled while searching, while another column sort is active, and
  for `layout: tree` collections. Folders are never draggable.
- New entries prefill the field with `max + 1` (they land at the bottom).
- If entries changed on GitHub since the list loaded, the save is rejected with
  a "refresh and try again" error instead of overwriting.

**3. Site-side consumption.** The Astro site must sort by the field ascending —
the CMS only writes numbers, it doesn't control render order:

```ts
const members = (await getCollection("team"))
  .map((entry) => entry.data)
  .sort((a, b) => a.sort_order - b.sort_order);
```

**4. Lists inside an entry (`list: true` fields).** Array items already have
drag handles in the entry editor; their saved array order is the render order —
no extra field needed.

### Formats

`format` (usually inferred from the file extension): `json`, `yaml`, `toml`,
`yaml-frontmatter`, `json-frontmatter`, `toml-frontmatter` (body + frontmatter),
`datagrid` (CSV-like), `code`, `raw` (no parsing — pairs with a single `body` code
field or none).

---

## Field reference

A field is one entry in a `fields` array. Every field needs **exactly one** of `type`
(a built-in type) or `component` (a reference to a reusable `components` entry).

### Common keys (any field)

| key           | meaning                                                               |
| ------------- | --------------------------------------------------------------------- |
| `name`        | required id, `^[a-zA-Z0-9-_]+$` — the JSON key                        |
| `label`       | form label; `false` hides the label                                   |
| `description` | helper text under the field                                           |
| `type`        | one of the field types below (or use `component`)                     |
| `required`    | must be filled to save                                                |
| `default`     | prefilled value for new entries                                       |
| `hidden`      | keep in data, hide from the form                                      |
| `readonly`    | show but disable editing                                              |
| `pattern`     | regex string, or `{ regex, message }` for a custom validation message |
| `list`        | make the field repeatable — see below                                 |
| `options`     | per-type settings — see each type                                     |

**Repeatable fields — `list`:** `list: true`, or an object
`{ min?, max?, collapsible? }`. `collapsible` can be `{ collapsed?: bool, summary?: "{fields.title}" }`
to show each item as a collapsed row titled by a template. Works on any type
(`type: string, list: true` = a list of strings; `type: object, list: true` = repeatable groups).

### Field types

| type        | stores / renders                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`    | single-line text. Options: `minlength`, `maxlength`, `placeholder`, `type` (`url`/`email`/`tel` → icon, see [Typed inputs](#typed-string-inputs--optionstype))                                                                              |
| `text`      | multi-line textarea. Options: `minlength`, `maxlength`, `placeholder`                                                                                                                                                                       |
| `rich-text` | WYSIWYG. Options: `format` (`html` \| markdown default), `switcher` (md/html toggle, default true), plus image opts (`media`, `path`, `extensions`)                                                                                         |
| `number`    | numeric. Options: `min`, `max`, `step`                                                                                                                                                                                                      |
| `boolean`   | toggle                                                                                                                                                                                                                                      |
| `date`      | shadcn calendar picker, **pre-fills with today** on new entries. Options: `time` (→ date-time), `format` (save format), `min`, `max`, `step`                                                                                                |
| `select`    | dropdown. Options: `values` (list of strings or `{value,label}`), `multiple`, `min`, `max`, `placeholder`                                                                                                                                   |
| `image`     | media picker (image). Options: `media`, `path`, `extensions`, `categories`, `multiple` (bool or `{max}`), `unique`, `rename`                                                                                                                |
| `file`      | media picker (any file). Same options as `image`                                                                                                                                                                                            |
| `code`      | code editor. Options: `format` (`js`/`ts`/`tsx`/`json`/`yaml`/`html`/`mdx`, default markdown), `minlength`, `maxlength`                                                                                                                     |
| `reference` | pick entry/entries from a collection. Options: `collection` (required), `multiple`, `search` (field, default `name`), `value` (template, default `{path}`), `label` (template, default `{name}`), `store` (`object` → save `{value,label}`) |
| `uuid`      | auto id. Options: `editable`, `generate` (default true → regenerate button)                                                                                                                                                                 |
| `object`    | a group of nested `fields` (use `list: true` for repeatable groups)                                                                                                                                                                         |
| `block`     | polymorphic item — pick one shape from `blocks` (see below)                                                                                                                                                                                 |

### Publish / created dates — always use `type: date`

Never model a publish/created date as `type: number` with an epoch timestamp — the
editor gets a raw number input and has to hand-type milliseconds. Use `type: date`:
it renders a calendar picker pre-filled with today, so the editor usually just clicks
Save.

```yaml
- name: created_at
  label: Publish date
  type: date
  required: true
```

- Saves `yyyy-MM-dd` by default. Use `options: { format: ... }` (date-fns tokens) for
  another save format, or `options: { time: true }` for a datetime.
- Astro side (`src/content.config.ts`): declare the field as `z.coerce.date()`. Then
  sort with `b.created_at.getTime() - a.created_at.getTime()` and format with
  `created_at.toLocaleDateString(...)` — no epoch math.
- **Always pass `timeZone: "UTC"` to `toLocaleDateString`** — `yyyy-MM-dd` parses as
  UTC midnight, so local-time formatting renders the previous day in western
  timezones.
- CMS `view.sort` on the field works as-is: lexical sort of `yyyy-MM-dd` is
  chronological.

### Field labels — write for clients

Labels are read by non-technical clients. Prefer plain language over CMS jargon
("Description", not "Excerpt"; "Publish date", not "created_at"). When a field's
purpose isn't obvious from its label, add a `description:` helper line explaining
where the value shows up (e.g. "Short summary shown on the newsletter card and in
search results").

### `object` — grouped / nested fields

Groups related fields under one key. This is how sections like `seo`, `hero`, `contact`
are built. Add `list: true` for a repeatable set (cards, stats, team members).

```yaml
- name: hero
  label: Hero
  type: object
  fields:
    - { name: heading, label: Heading, type: string }
    - {
        name: cta,
        label: Button,
        type: object,
        fields:
          [
            { name: label, type: string },
            { name: link, type: string, options: { type: url } },
          ],
      }
```

### `block` — flexible content blocks

A list of mixed block shapes (page-builder style). `blocks` lists the possible shapes;
`blockKey` (default `_block`) is the discriminator key stored on each item naming its type.

```yaml
- name: sections
  label: Sections
  type: block
  list: true
  blockKey: _block
  blocks:
    - {
        name: text,
        label: Text,
        type: object,
        fields: [{ name: body, type: text }],
      }
    - {
        name: image,
        label: Image,
        type: object,
        fields: [{ name: src, type: image }],
      }
```

### Reusable fields — `components`

Define a field shape once under top-level `components`, then reference it with
`component:` on any field (instead of `type:`). Keeps repeated shapes (a link, an image
with alt) DRY.

```yaml
components:
  link:
    type: object
    fields:
      - { name: label, type: string }
      - { name: href, type: string, options: { type: url } }

content:
  - name: nav
    type: file
    path: src/data/nav.json
    fields:
      - { name: primaryCta, label: Primary CTA, component: link }
```

---

## Media — top-level `media`

Tells the CMS where uploads live and how they map to public URLs. Simplest form:

```yaml
media:
  input: public/media # repo folder uploads are written to
  output: /media # public URL prefix the site serves them from
```

Optional keys: `path` (default browse folder), `extensions` (allowed types),
`categories` (`image`/`document`/`video`/`audio`/`compressed`/`code`/`font`/`spreadsheet`),
`rename` (`true`/`"safe"`/`"random"` — auto-rename on upload). For multiple media roots,
give an **array** of objects each with a `name` (then reference by name in a field's
`options.media`).

---

## Typed string inputs — `options.type`

Give a `string` field `options.type` to tell the CMS the value is a link, email, or
phone number. The CMS then renders the input with a **leading icon**:

| `options.type` | icon  | use for                                  |
| -------------- | ----- | ---------------------------------------- |
| `url`          | link  | links, CTAs/buttons, social profile URLs |
| `email`        | email | `mailto:` / contact email addresses      |
| `tel`          | phone | `tel:` dial links / phone numbers        |

The value is stored **verbatim as plain text** — there is no strict URL validation,
so relative links like `/donate` and `tel:+1971...` are all valid.

Only add `options.type` when the field really holds that kind of value. A normal
`string` field stays a plain input.

```yaml
- name: href
  label: Link
  type: string
  options: { type: url }

- name: email
  label: Contact email
  type: string
  options: { type: email }

- name: phoneHref
  label: Phone link
  type: string
  options: { type: tel }
```

---

## SEO / metadata section — `seo`

To give a page search-engine metadata, add a **top-level object field named exactly
`seo`** with `title` and `description` subfields. The CMS recognizes it and shows a
**live Google search-result (SERP) preview** that updates as you type.

Rules:

- The section's `name` **must be `seo`** and it must be **top-level** (a direct
  entry in the page file's `fields`, not nested inside another object).
- Keep the subfield names **`title`** (string) and **`description`** (text) — the
  preview reads those.
- Put it first in the page's `fields` so metadata sits at the top of the form.

```yaml
- name: seo
  label: SEO
  type: object
  fields:
    - name: title
      label: Title
      type: string
      required: true
    - name: description
      label: Description
      type: text
```

Then wire the values into the page's `<head>` in your Astro layout (e.g.
`<title>{seo.title}</title>` and `<meta name="description" content={seo.description}>`).

---

## Live preview highlighting — `settings` + `data-cms-field`

The CMS can dock a **live preview of the site** in the bottom-right of the edit
screen. When the client focuses a field input, the preview **scrolls to and
highlights** the matching element on the page — so a non-technical client always
knows which text/image an input controls.

This needs three things wired up per site. **When you build or edit a site, do all
three so preview works out of the box.**

### 1. `settings.baseUrl` (+ optional `settings.preview.paths`)

Add a top-level `settings` block to `.pages.yml` with the site's live URL. Without
`baseUrl` the preview panel simply doesn't show.

```yaml
settings:
  baseUrl: https://the-client-site.com # live (or local dev) URL of the site
  preview:
    paths: # optional — override the route for a content entry
      site: / # default route is `/` for entry `home`, else `/<name>`
      about: /about
      hervoice-winners: /hervoice/winners
```

Route resolution per content entry: `settings.preview.paths[<entry name>]` if set,
otherwise `/` when the entry is named `home`, otherwise `/<entry name>`. A
single-page site whose only entry is `site` therefore needs `paths: { site: / }`.

### 2. `data-cms-field` on every rendered element

Every element that outputs a CMS value **must** carry a `data-cms-field` attribute
whose value is the **exact `.pages.yml` field path** — the same dot-path the CMS
uses and the same key path as the JSON. Section object name + field name, joined by
dots; **list items append their index**.

| `.pages.yml` field          | `data-cms-field` value |
| --------------------------- | ---------------------- |
| top-level `tagline`         | `tagline`              |
| `hero` › `heading`          | `hero.heading`         |
| `seo` › `title`             | `seo.title`            |
| `features` (list) item 0    | `features.0`           |
| `features` item 0 › `title` | `features.0.title`     |

Before / after:

```astro
<!-- before -->
<h1>{site.hero.heading}</h1>

<!-- after -->
<h1 data-cms-field="hero.heading">{site.hero.heading}</h1>
```

List loops — use the loop index (add it to the `.map` callback):

```astro
{site.features.map((feature, i) => (
  <div data-cms-field={`features.${i}`}>
    <h2 data-cms-field={`features.${i}.title`}>{feature.title}</h2>
    <p data-cms-field={`features.${i}.text`}>{feature.text}</p>
  </div>
))}
```

For an element that renders a whole object (e.g. an `<a>` that uses both a `cta.label`
and a `cta.link` field), tag it with the object path (`data-cms-field="hero.cta"`).
Focusing either subfield resolves to it via the prefix fallback below.

**Resolution order** in the browser: exact match → nearest tagged ancestor path
(`hero.cta.link` → `hero.cta` → `hero`) → first tagged descendant. So tagging the
most specific elements you can is best; objects highlight through their children.

#### Component-based sites — the `cmsField()` helper

When a page renders its data **inline** (like this template's `index.astro`, which
reads root-level `site.json` directly), the field paths are static — just write the
literal string: `data-cms-field="hero.heading"`.

But most real sites split each section into its own component and pass a **slice** of
the data down (`<Hero {...content.hero} />`). Inside `Hero.astro` you no longer know
you're the `hero` section — so hardcoding `"hero.heading"` would be wrong and
un-reusable. Instead, the page passes the section's key as a `cmsPath` prop and the
component builds paths from it with the `cmsField()` helper in `src/lib/cms.ts`:

```ts
// src/lib/cms.ts
export function cmsField(
  prefix: string | undefined,
  sub?: string,
): string | undefined {
  if (prefix === undefined) return undefined; // not in preview → omit attr
  const path = [prefix, sub].filter(Boolean).join(".");
  return path || undefined;
}
```

```astro
---
// src/pages/index.astro — page passes the section key as cmsPath
import Hero from "../components/marketing/home/Hero.astro";
import content from "../data/home.json";
---
<Hero cmsPath="hero" {...content.hero} />
```

```astro
---
// src/components/marketing/home/Hero.astro — component builds paths off cmsPath
import { cmsField } from "../../../lib/cms";
interface Props { heading: string; images: { image: string }[]; cmsPath?: string }
const { heading, images, cmsPath } = Astro.props;
---
<h1 data-cms-field={cmsField(cmsPath, "heading")}>{heading}</h1>
{images.map((img, i) => (
  <img src={img.image} data-cms-field={cmsField(cmsPath, `images.${i}.image`)} />
))}
```

Rules:

- Page passes `cmsPath="<sectionKey>"` — the key must equal the JSON slice key and the
  `.pages.yml` field name (e.g. `statsBar`, `herVoiceContest`).
- The component adds an optional `cmsPath?: string` prop and tags every leaf with
  `cmsField(cmsPath, "<sub>")`. Nested lists append indices: `cmsField(cmsPath, `stats.${i}.number`)`.
- **Thread into child components**: pass a deeper prefix down, e.g.
  `<TeamMember cmsPath={cmsField(cmsPath, `groups.${gi}.members.${mi}`)} … />`, and the
  child tags its own leaves (`cmsField(cmsPath, "name")`).
- **Root-level pages** (fields live at the JSON root, no wrapping section object — e.g.
  a Privacy page): the page passes `cmsPath=""`, and `cmsField("", "title")` yields the
  bare path `"title"`.
- When `cmsPath` is `undefined` (a normal visit, not the CMS preview), `cmsField` returns
  `undefined` so **no attribute renders** — zero production overhead.

Because `cmsField` returns `undefined` for the no-prefix case, it produces the same
output as writing the literal by hand — use literals for inline root pages, the helper
for anything that receives a `cmsPath` prop.

### 3. The bridge script

The site must ship the preview bridge and fetch it **only** when the URL has
`?cms-preview=1` (the CMS iframe adds this flag). Copy `public/cms-preview.js` from
the template, and in the base layout add a tiny inline loader that checks the flag
client-side and injects the bridge only then.

> **Why not gate with `Astro.url.searchParams`?** Static (prerendered) Astro pages
> have no query params at render time — `Astro.url.search` is always empty — so a
> server-side `{Astro.url... && <script>}` gate never fires. Gate on the client with
> `location.search` instead.

```astro
<!-- src/layouts/Layout.astro, just before </body> -->
<script is:inline>
  if (new URLSearchParams(location.search).has("cms-preview")) {
    var s = document.createElement("script");
    s.src = "/cms-preview.js";
    document.head.appendChild(s);
  }
</script>
```

Normal visitors run the tiny inline check, it's false, and the 2.8KB bridge is never
fetched.

The script listens for the CMS `postMessage`, resolves the element by
`data-cms-field`, scrolls to it, and adds a brief highlight outline. It stays inert
(and unloaded) for real visitors.

> **The one rule that makes it all work:** the CMS field path, the JSON key, and the
> `data-cms-field` value are the same string. Keep them aligned and there is nothing
> else to map.

---

## Sidebar grouping — `type: group` in `content`

When a site has many pages, a flat `content` list forces the client to scroll a long
column to find anything. Organize related entries into **collapsible groups** so the
sidebar reads as a few categories instead of 25+ loose items.

A group is an entry in the top-level `content` array with **`type: group`** and an
**`items`** array holding the real entries (files/collections). The CMS renders it as
a collapsible section with a chevron and a **leaf-count badge**, and auto-expands the
group containing the active page.

Rules:

- `type: group` and `items` are required. `items` holds normal `content` entries
  (`type: file` / `type: collection`) — or nested groups (grouping is recursive).
- `name` must be **alphanumeric with dashes/underscores** (`^[a-zA-Z0-9-_]+$`) and
  unique among its siblings. It is a UI key only — it is **not** a route or a file.
- `label` is the visible category title. `description` is optional.
- Grouping is **presentation only** — it does not change any page's URL or file path.
  The entries inside `items` keep the exact `name`/`path`/`type` they had when flat, so
  moving a page into a group never breaks its content or links.
- Entries left at the top level (not inside any group) still render flat, above/among
  the groups. Grouping is opt-in per entry — you do not have to group everything.

Group by what the client thinks in (Programs, About, Get Involved, Legal…), keep each
group to a handful of entries, and put the most-used pages (Home) at the top level or
first. Clients can also jump to any page instantly with the sidebar's **⌘K search**,
which searches across all groups — so grouping is about tidiness, not findability.

```yaml
content:
  # Frequently-used pages can stay flat at the top.
  - name: home
    label: Home
    type: file
    path: src/content/home.md
    # ...fields

  - name: programs
    label: Programs
    type: group
    items:
      - name: mentorship
        label: Mentorship
        type: file
        path: src/content/mentorship.md
        # ...fields
      - name: hervoice-winners
        label: HerVoice Winners
        type: collection
        path: src/content/hervoice-winners
        # ...fields

  - name: legal
    label: Legal
    type: group
    items:
      - name: privacy
        label: Privacy Policy
        type: file
        path: src/content/privacy.md
        # ...fields
```

> **When re-organizing an existing site:** move entries into `type: group` wrappers
> **without editing their `path`, `name`, or fields**. Only the nesting changes.
