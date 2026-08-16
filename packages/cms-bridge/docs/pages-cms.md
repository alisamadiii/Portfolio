# Pages CMS — `.pages.yml` conventions

The shapes the Pages CMS understands in a site's `.pages.yml`. Match them exactly —
the CMS renders special UI (canvas, live preview, SERP preview, groups) only when it
sees these. Learn by the YAML blocks and the hard rules; author configs by copying and
adapting them.

> **Maintainers:** canonical copy shipped in `@alisamadiillc/cms-bridge`, synced into
> each project by `npx cms-bridge init`. Edit here (`docs/pages-cms.md`), publish,
> re-run init — never hand-edit the synced copy inside a project.

---

## The `site` entry — REQUIRED on every client project

**Every site MUST have a global config entry named exactly `site`** — the one place a
client edits their identity (name, logo, phone, email, address). The canvas "Site
settings" panel opens it, and in-page global fields (header/footer on every page)
resolve through it; a project without it breaks both. Same shape on every project so
clients move between them seamlessly.

```yaml
settings:
  baseUrl: https://the-client-site.com
  preview:
    paths:
      site: / # site previews at the homepage
      home: /
    global: [site] # `site` is the default; explicit is fine

content:
  - name: site # EXACTLY `site` — CMS defaults global resolution to this name
    label: Site (global)
    description: Business name, contact details and footer — shown on every page.
    type: file
    path: src/data/site.json # EXACTLY this path
    format: json
    fields:
      # baseline fields below
```

Baseline fields (include those that apply, in this order):

```yaml
fields:
  - name: seo
    label: SEO
    type: object
    fields:
      - { name: title, label: Title, type: string, required: true, description: "Page title in Google results and the browser tab." }
      - { name: description, label: Description, type: text, description: "Summary under the title in Google results." }
  - { name: name, label: Business name, type: string, required: true }
  - { name: tagline, label: Tagline, type: string }
  - { name: logo, label: Logo, type: image }
  - { name: phone, label: Phone, type: string, options: { type: tel } }
  - { name: email, label: Email, type: string, options: { type: email } }
  - name: address
    label: Address
    type: object
    fields:
      - { name: street, label: Street, type: string }
      - { name: city, label: City, type: string }
      - { name: region, label: State, type: string }
      - { name: zip, label: ZIP, type: string }
      - { name: mapsUrl, label: Google Maps link, type: string, options: { type: url } }
  - name: socials
    label: Social links
    type: object
    list: true
    fields:
      - { name: label, label: Network, type: string }
      - { name: url, label: Profile URL, type: string, options: { type: url } }
  - name: footer
    label: Footer
    type: object
    fields:
      - { name: text, label: Footer text, type: string }
```

Rules:

- `name: site`, `type: file`, `path: src/data/site.json`, `format: json` — identical on
  every project. List it **first** in `content`, top-level (never in a group).
- Use these **exact field names** when the concept exists; don't invent synonyms
  (`businessName`, `telephone`). Omit what doesn't apply; extend after the baseline with
  industry globals (`hours`, `orderUrl`…), same naming discipline.
- Its **top-level keys must never overlap** a page entry sharing a route (overlap breaks
  field→entry resolution on the canvas). Key a homepage catering band `cateringPromo`,
  not `catering`, if `site` already owns `catering`.
- Everything rendered from `site.json` carries `data-cms-field` with the site-relative
  path (`name`, `phone`, `hours.0.days`) — no entry prefix. That lets the canvas edit the
  footer phone on any page and update every page live.

**Migrating a project without one:** create `src/data/site.json` and move globals into it
(baseline names); add the `site` entry first in `content` + `preview.paths.site: /`; tag
`Header.astro`/`Footer.astro` elements with `data-cms-field`; drop the now-duplicated keys
from page entries.

---

## Content entries — `content`

`content` is an array of entries, each a `type` of **`file`** (one editable file),
**`collection`** (a folder of like files), or **`group`** (nav folder only — see
[Sidebar grouping](#sidebar-grouping--type-group-in-content)).

### `type: file`

```yaml
- name: home # unique id, ^[a-zA-Z0-9-_]+$ (also the preview route key)
  label: Home # nav label
  description: Landing page # optional
  type: file
  path: src/data/home.json # relative, no leading/trailing slash
  format: json # usually inferred from the extension
  fields: [...] # the form (see Field reference)
```

### `type: collection`

A folder of same-shaped entries (blog posts, team, projects); client gets a list view +
create/edit/delete.

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
    primary: title # display field
    sort: [date, title] # sortable columns
    search: [title] # searchable fields
    default: { sort: date, order: desc }
    reorder: sort_order # optional drag-to-reorder, names a number field (see Ordering)
  operations: { create: true, rename: true, delete: true } # optional gating
  fields: [...]
```

> **Gotcha:** the list only shows files whose extension matches the `filename` template's
> extension. The default template ends `.md`, so a `format: json` collection shows "No
> entries" unless you set e.g. `filename: "{primary}.json"`.

**Filename tokens** (expanded at create time): `{year}` `{month}` `{day}` `{hour}`
`{minute}` `{second}`, `{primary}` (alias `{slug}` — slugified primary field),
`{fields.<name>}` / `{<name>}` (any field, slugified). Give `filename` as an object to
expose it as an editable field: `filename: { template: "{primary}.md", field: true }`
(`field: "create"` = editable only when creating).

Other entry keys: `delimiters` (frontmatter delimiter override), `commit`
(`{ templates?, identity? }` — custom commit message/author), `format: raw` (edit the file
body as-is, no field parsing).

### Ordering

1. **List sorting (display only):** `view.sort` = sortable columns; `view.default:
   { sort, order }` = initial sort (fallback: a `date` field, else primary). Changes no
   files.
2. **Drag-to-reorder (`view.reorder`):** set it to a **`type: number` field** (convention
   `sort_order`, `required: true`). List becomes drag-sortable; dropping a row rewrites the
   field to `0..n-1` in **one commit**; gaps/dupes self-heal; new entries get `max + 1`.
   Disabled while searching, under another sort, and for `layout: tree`. Stale-since-load
   saves are rejected with a refresh error.

   ```yaml
   - name: team
     type: collection
     path: src/content/team
     format: json
     filename: "{primary}.json"
     view: { fields: [name, role], primary: name, reorder: sort_order }
     fields:
       - { name: name, label: Name, type: string, required: true }
       - { name: sort_order, label: Sort order, type: number, required: true }
   ```

   Site must sort by it — the CMS only writes numbers:
   ```ts
   const members = (await getCollection("team")).map((e) => e.data)
     .sort((a, b) => a.sort_order - b.sort_order);
   ```
3. **Lists inside an entry (`list: true`):** array items already drag in the editor; saved
   array order is render order — no extra field.

### Formats

`format` (usually inferred from extension): `json`, `yaml`, `toml`, `yaml-frontmatter`,
`json-frontmatter`, `toml-frontmatter` (body + frontmatter), `datagrid` (CSV-like), `code`,
`raw` (no parsing — pairs with a single `body` code field or none).

---

## Field reference

A field is one item in a `fields` array. Each needs **exactly one** of `type` (built-in) or
`component` (a reusable `components` entry).

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
| `pattern`     | regex string, or `{ regex, message }` for a custom message            |
| `list`        | make the field repeatable — see below                                 |
| `options`     | per-type settings — see each type                                     |

**Repeatable — `list`:** `list: true`, or `{ min?, max?, collapsible? }`. `collapsible`
can be `{ collapsed?, summary?: "{fields.title}" }`. Works on any type (`string, list: true`
= list of strings; `object, list: true` = repeatable groups).

### Field types

| type        | stores / renders                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`    | single-line. Options: `minlength`, `maxlength`, `placeholder`, `type` (`url`/`email`/`tel` → icon, see [Typed inputs](#typed-string-inputs--optionstype))   |
| `text`      | multi-line textarea. Options: `minlength`, `maxlength`, `placeholder`                                                                                        |
| `rich-text` | WYSIWYG. Options: `format` (`html` \| markdown default), `switcher` (default true), image opts (`media`, `path`, `extensions`)                               |
| `number`    | numeric. Options: `min`, `max`, `step`                                                                                                                       |
| `boolean`   | toggle                                                                                                                                                       |
| `date`      | calendar picker, **pre-fills today** on new entries. Options: `time` (→ date-time), `format`, `min`, `max`, `step`                                           |
| `select`    | dropdown. Options: `values` (strings or `{value,label}`), `multiple`, `min`, `max`, `placeholder`                                                            |
| `image`     | media picker (image). Options: `media`, `path`, `extensions`, `categories`, `multiple` (bool or `{max}`), `unique`, `rename`                                 |
| `file`      | media picker (any file). Same options as `image`                                                                                                            |
| `code`      | code editor. Options: `format` (`js`/`ts`/`tsx`/`json`/`yaml`/`html`/`mdx`, default markdown), `minlength`, `maxlength`                                       |
| `reference` | pick from a collection. Options: `collection` (required), `multiple`, `search` (default `name`), `value` (default `{path}`), `label` (default `{name}`), `store` |
| `uuid`      | auto id. Options: `editable`, `generate` (default true)                                                                                                     |
| `object`    | group of nested `fields` (use `list: true` for repeatable groups)                                                                                           |
| `block`     | polymorphic item — pick one shape from `blocks`                                                                                                             |

**Labels — write for clients** (non-technical): plain language, not jargon ("Description"
not "Excerpt"; "Publish date" not "created_at"). Add a `description:` when a field's purpose
isn't obvious from its label.

**Publish/created dates — always `type: date`,** never a `number` epoch (the editor would
hand-type milliseconds). Saves `yyyy-MM-dd` (pre-filled today); `options: { format }` for
another save format, `options: { time: true }` for datetime. Astro: declare
`z.coerce.date()`, sort by `.getTime()`, and **always pass `timeZone: "UTC"` to
`toLocaleDateString`** (yyyy-MM-dd is UTC midnight — local formatting renders the previous
day in western timezones).

### `object` — grouped / nested fields

Groups fields under one key (how `seo`, `hero`, `contact` are built). `list: true` for a
repeatable set.

```yaml
- name: hero
  label: Hero
  type: object
  fields:
    - { name: heading, label: Heading, type: string }
    - { name: cta, label: Button, type: object, fields: [
        { name: label, type: string },
        { name: link, type: string, options: { type: url } },
      ] }
```

### `block` — flexible content blocks

Mixed block shapes (page-builder). `blocks` lists shapes; `blockKey` (default `_block`) is
the discriminator stored on each item.

```yaml
- name: sections
  label: Sections
  type: block
  list: true
  blockKey: _block
  blocks:
    - { name: text, label: Text, type: object, fields: [{ name: body, type: text }] }
    - { name: image, label: Image, type: object, fields: [{ name: src, type: image }] }
```

### Reusable fields — `components`

Define a shape once under top-level `components`, reference with `component:` (instead of
`type:`).

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

Where uploads live and how they map to public URLs.

```yaml
media:
  input: public/media # repo folder uploads are written to
  output: /media # public URL prefix the site serves them from
```

Optional: `path` (default browse folder), `extensions`, `categories`
(`image`/`document`/`video`/`audio`/`compressed`/`code`/`font`/`spreadsheet`), `rename`
(`true`/`"safe"`/`"random"`). For multiple roots, give an **array** of `{ name, … }` objects
and reference by name in a field's `options.media`.

---

## Typed string inputs — `options.type`

Give a `string` field `options.type` so the CMS renders a leading icon. Value stored
**verbatim** (no URL validation — `/donate`, `tel:+1971…` all valid). Only add it when the
field really holds that value.

| `options.type` | for                                      |
| -------------- | ---------------------------------------- |
| `url`          | links, CTAs/buttons, social profile URLs |
| `email`        | `mailto:` / contact emails               |
| `tel`          | `tel:` dial links / phone numbers        |

```yaml
- { name: href, label: Link, type: string, options: { type: url } }
- { name: email, label: Contact email, type: string, options: { type: email } }
- { name: phoneHref, label: Phone link, type: string, options: { type: tel } }
```

---

## SEO / metadata section — `seo`

A **top-level object field named exactly `seo`** with `title` (string) + `description`
(text). The CMS shows a live Google SERP preview. Must be top-level (direct in the page
file's `fields`, not nested); put it first.

```yaml
- name: seo
  label: SEO
  type: object
  fields:
    - { name: title, label: Title, type: string, required: true }
    - { name: description, label: Description, type: text }
```

Wire into `<head>`: `<title>{seo.title}</title>`,
`<meta name="description" content={seo.description}>`.

**Collections auto-derive their SEO.** For `type: collection` entries the CMS hides the
`seo` section in the entry form and fills it at save time: `seo.title` ← the primary field
(usually `title`), `seo.description` ← the first non-blank of `excerpt` / `description` /
`summary`. Only blank values are filled — hand-written seo in existing records is never
overwritten, and existing values round-trip untouched. Still declare the `seo` field on
collections (the astro templates read it), but do **not** mark it or its subfields
`required`. File entries (pages) keep the visible SEO section + SERP preview.

### Site name in search results

Google shows a **site name** above the title (not the bare domain) only when the site
advertises one consistently. Wire all three signals off `site.name` in the shared `<head>`
(`SEO.astro` or the layout):

```astro
---
import site from "../data/site.json";
---
<meta name="application-name" content={site.name} />
<meta property="og:site_name" content={site.name} />
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: Astro.site?.href,
})} />
```

- All three must carry the **same** `site.name` — mismatches fall back to the domain.
- Add `alternateName` to the `WebSite` node for a long legal name with a short common one
  ("EmpowerHer Initiative Inc." → "EmpowerHer").
- Changes take a few crawls to appear.

---

## Live preview highlighting — `settings` + `data-cms-field`

The CMS docks a live site preview; focusing a field scrolls to and highlights the matching
element. Three things per site — do all three when you build or edit one.

### 1. `settings.baseUrl` + `settings.preview.paths`

Without `baseUrl` the preview doesn't show.

```yaml
settings:
  baseUrl: https://the-client-site.com # live (or local dev) URL
  preview:
    paths: # entry → route; THIS list is the canvas
      site: / # global entry, previews at /
      home: / # homepage content
      about: /about
      hervoice-winners: /hervoice/winners
    global: [site] # optional — entries on EVERY page (header/footer)
```

**`preview.paths` is the sole source of canvas tiles.** The canvas renders exactly one tile
per key here (collections with `{slug}` collapse to one — see below); there is no sitemap
crawl and no default-route inference. An entry absent from `preview.paths` gets **no tile**
— to show a page on the canvas you must map it here. A single-page site whose only entry is
`site` needs `paths: { site: / }`. Multiple keys may share one route (`site` + `home` → `/`);
the first-listed wins the tile, the rest still resolve for in-page field editing. **Tiles
appear in the order the keys are listed** (no alphabetical sort) — order `preview.paths` to
control the canvas layout.
`preview.global` lists entries whose fields appear on every page (defaults to a `site` entry
when omitted) — the canvas uses it to resolve which JSON an in-page edit belongs to and
update all frames at once.

#### Collection detail routes — the `{slug}` placeholder

When a `type: collection` has a per-record detail page (a dynamic route like
`src/pages/blog/[slug].astro`), give its preview path the record placeholder **`{slug}`**:

```yaml
preview:
  paths:
    blogPage: /blog # the list page (a `type: file` entry)
    blog: /blog/{slug} # the collection → one templated detail route
```

Map the collection under one `{slug}` key so it stays one tile. Without the placeholder the
key resolves to a single detail route; with `{slug}` the tile becomes a "Linked to a CMS table · Manage entries"
placeholder (records edited in the list view). Use `{slug}` regardless of field name; the
template must match the built route (`/hervoice/{slug}` for `/hervoice/<slug>`). Collections
that render **inline** on a parent page (logo strip, team grid — no `[slug]` route) need no
preview path.

### 2. `data-cms-field` on every rendered element

Every element outputting a CMS value carries `data-cms-field` = the **exact `.pages.yml`
field path** (same dot-path as the JSON key). Section object + field, dot-joined; **list
items append their index**.

| `.pages.yml` field          | `data-cms-field` |
| --------------------------- | ---------------- |
| top-level `tagline`         | `tagline`        |
| `hero` › `heading`          | `hero.heading`   |
| `seo` › `title`             | `seo.title`      |
| `features` (list) item 0    | `features.0`     |
| `features` item 0 › `title` | `features.0.title` |

```astro
<h1 data-cms-field="hero.heading">{site.hero.heading}</h1>

{site.features.map((feature, i) => (
  <div data-cms-field={`features.${i}`}>
    <h2 data-cms-field={`features.${i}.title`}>{feature.title}</h2>
    <p data-cms-field={`features.${i}.text`}>{feature.text}</p>
  </div>
))}
```

Tag an element that renders a whole object with the object path (`data-cms-field="hero.cta"`).
**Resolution:** exact match → nearest tagged ancestor (`hero.cta.link` → `hero.cta` → `hero`)
→ first tagged descendant. Tag the most specific elements you can.

#### Component-based sites — the `cmsField()` helper

Inline pages (reading a root-level `site.json` directly) use literal strings
(`data-cms-field="hero.heading"`). But components that receive a **slice**
(`<Hero {...content.hero} />`) don't know their section, so the page passes the section key
as a `cmsPath` prop and the component builds paths with `cmsField()` (`src/lib/cms.ts`):

```ts
export function cmsField(prefix: string | undefined, sub?: string): string | undefined {
  if (prefix === undefined) return undefined; // not in preview → omit attr
  const path = [prefix, sub].filter(Boolean).join(".");
  return path || undefined;
}
```

```astro
---
// page passes the section key
import Hero from "../components/home/Hero.astro";
import content from "../data/home.json";
---
<Hero cmsPath="hero" {...content.hero} />
```

```astro
---
// component builds paths off cmsPath
import { cmsField } from "../../lib/cms";
const { heading, images, cmsPath } = Astro.props;
---
<h1 data-cms-field={cmsField(cmsPath, "heading")}>{heading}</h1>
{images.map((img, i) => (
  <img src={img.image} data-cms-field={cmsField(cmsPath, `images.${i}.image`)} />
))}
```

- `cmsPath="<sectionKey>"` must equal the JSON slice key and the `.pages.yml` field name.
- Component adds `cmsPath?: string` and tags leaves `cmsField(cmsPath, "<sub>")`; lists append
  indices. **Thread into children**: `<TeamMember cmsPath={cmsField(cmsPath, `groups.${gi}.members.${mi}`)} />`.
- **Root-level pages** (fields at JSON root, no section object): page passes `cmsPath=""`;
  `cmsField("", "title")` → `"title"`.
- `undefined` prefix (normal visit) → returns `undefined` → no attribute → zero production
  overhead.

### 3. The bridge — `@alisamadiillc/cms-bridge` (Astro integration)

Ship the bridge via the npm package — upgrading every client site is a version bump.

```bash
pnpm add @alisamadiillc/cms-bridge
```

```js
// astro.config.mjs
import cmsBridge from "@alisamadiillc/cms-bridge/astro";
export default defineConfig({ integrations: [sitemap(), cmsBridge()] });
```

Injects a ~200 B inline check; the bridge (~5 KB) loads **only** when the URL has
`?cms-preview=…` (added by the CMS iframe). Modes:

- `?cms-preview=1` — **highlight** (docked preview): CMS posts a field path on focus; bridge
  scrolls to and pulses the `data-cms-field` element. Read-only.
- `?cms-preview=edit` — **canvas edit**: leaf `data-cms-field` text becomes `contenteditable`;
  on blur the bridge posts `{ type: "field-commit", path, value }`; the CMS resolves the entry
  by schema membership and saves a draft. CMS can push `{ type: "set", values }` back so drafts
  and cross-page globals update live in every frame.

Survives `ClientRouter` soft nav via `sessionStorage`; re-scans on `astro:page-load`. Legacy
`public/cms-preview.js` still works (v1 protocol) — migrate by installing the package, adding
the integration, and deleting the old script + inline loader.

> **The one rule:** CMS field path = JSON key = `data-cms-field` value, the same string. Keep
> them aligned and there is nothing else to map.

### Automating it — the `cms-bridge` CLI

- `npx cms-bridge init` — extract page text → `src/data/*.json`, tag `data-cms-field`, merge
  `.pages.yml` (append-only, your edits win), add the integration, write `cms-report.md` for
  anything unsafe to auto-convert. Idempotent. Also syncs THIS doc into the project.
- `npx cms-bridge check` — analyze only; non-zero exit while unwired content/config remains.
- `npx cms-bridge collections` — sync `cms/collections/*.yml` (see below).

---

## Collections — `cms/collections/*.yml`

**Every client project should define its collections this way.** A collection is a
"database table" of repeating records — blog posts, jobs, testimonials, newsletters. The
client manages them through the CMS overlay, whose list comes straight from the
`type: collection` entries in `.pages.yml`; no definitions means an empty CMS. (Page copy is
edited on the canvas — only table-like records belong in a collection.)

Define one as a file, then sync. The file body IS the `.pages.yml` entry body; `name` (from
the filename) and `type: collection` are injected, defaults fill the rest.

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

Defaults when omitted: `path: src/data/<name>`, `format: json`,
`filename: "{year}-{month}-{day}-{fields.<primary>}.json"`, `view.primary` = the field named
`title` (else first non-object field).

`npx cms-bridge collections` upserts each definition into a `Collections` group (append-only),
creates the content directory, and with `--sample` writes one sample entry. Deleting a
definition doesn't delete the entry (reported as an orphan). Never hand-author a collection
entry into `.pages.yml` — write the definition and sync.

**If a collection has a per-record detail page** (`src/pages/blog/[slug].astro`), also map its
route with the `{slug}` placeholder (`preview.paths.blog: /blog/{slug}`) so the canvas shows
one placeholder instead of a tile per record — see
[Collection detail routes](#collection-detail-routes--the-slug-placeholder).

---

## Sidebar grouping — `type: group` in `content`

Organize related entries into **collapsible groups** so the CMS reads as a few categories
instead of 25+ loose items. A group is a top-level `content` entry with `type: group` and an
`items` array of real entries; the CMS renders it collapsible with a leaf-count badge and
auto-expands the active one.

Rules:

- `type: group` + `items` required; `items` holds `file`/`collection` entries or nested groups.
- `name`: `^[a-zA-Z0-9-_]+$`, unique among siblings — a UI key only (not a route or file).
- `label` = visible title; `description` optional.
- **Presentation only** — entries keep their exact `name`/`path`/`type`, so grouping never
  changes a URL or breaks content. Ungrouped entries render flat. Opt-in per entry.

Group by what the client thinks in (Programs, About, Legal…), keep groups small, put
most-used pages (Home) first or flat. ⌘K search spans all groups, so grouping is tidiness,
not findability. When re-organizing an existing site, move entries into `group` wrappers
**without editing their `path`, `name`, or fields**.

```yaml
content:
  - name: home
    label: Home
    type: file
    path: src/content/home.md

  - name: programs
    label: Programs
    type: group
    items:
      - { name: mentorship, label: Mentorship, type: file, path: src/content/mentorship.md }
      - { name: hervoice-winners, label: HerVoice Winners, type: collection, path: src/content/hervoice-winners }

  - name: legal
    label: Legal
    type: group
    items:
      - { name: privacy, label: Privacy Policy, type: file, path: src/content/privacy.md }
```
