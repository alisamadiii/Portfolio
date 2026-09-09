# Pages CMS — client project guide (v2)

How a client site is wired to the Pages CMS. The whole contract is two JSON
files at the repo root plus a set of Astro components — no `.pages.yml`, no
schema to maintain.

> **Maintainers:** canonical copy shipped in `@alisamadiillc/cms-bridge`, synced
> into each project by `npx cms-bridge init`. Edit here (`docs/pages-cms.md`),
> publish, re-run init — never hand-edit the synced copy inside a project.

---

## The files: root `_site.json` + `_pages.json`

Everything lives in **two files at the repo root**:

- **`_site.json`** — one config file with three keys: `cms` (§1, the manifest),
  `seo` (§4), and `variables` (§3).
- **`_pages.json`** — all page content (§2).

```json
// _site.json
{ "seo": { … }, "cms": { … }, "variables": { … } }
```

> **Legacy layout:** older repos split these into four files under `src/data/`
> (`cms.json`, `pages.json`, `variables.json`, `seo.json`). The hosted CMS now
> **requires** the root `_site.json` + `_pages.json` — migrate legacy repos or the
> CMS won't load them. Collection files also move to `_collections/` at the repo
> root, so `_site.json`, `_pages.json`, and `_collections/` all sit together under
> the leading underscore.

### 1. `_site.json` → `cms` — the manifest (the only config the CMS reads)

```json
{
  "version": 1,
  "baseUrl": "https://the-client-site.com",
  "media": { "input": "public/media", "output": "/media" },
  "pages": {
    "home": { "route": "/" },
    "menu": { "route": "/menu" },
    "story": { "route": "/our-story", "title": "Our Story" }
  },
  "collections": [
    {
      "name": "blog",
      "path": "_collections/blog",
      "route": "/blog/{slug}",
      "format": "md",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "date", "type": "date", "required": true },
        { "name": "banner", "type": "image" }
      ]
    }
  ]
}
```

- `baseUrl` (required) — the live site URL; the canvas loads its pages in
  iframes from here.
- `pages` keys ARE the top-level keys in `_pages.json`. Each entry becomes a
  canvas tile; its `route` maps a frame back to its page. `title` is optional
  (defaults to the key in Title Case).
- `collections` (optional) — see [Collections](#collections). This tiny field
  list is the ONLY schema left anywhere.

### 2. `_pages.json` — all page content, keyed by page name (its own root file)

```json
{
  "home": {
    "hero": {
      "heading": "Wood-fired pasta",
      "text": "Family recipes since 1962.",
      "image": "/media/hero.jpg",
      "imageAlt": "A plate of pasta",
      "cta": { "label": "Reserve a table", "link": "/contact" }
    },
    "seo": { "title": "Trattoria — Home", "description": "…" }
  },
  "menu": { "…": "…" }
}
```

One file, one GitHub fetch, one publish commit. Field paths in the markup stay
**page-relative** (`hero.heading`) — the page is implied by its route, never
prefixed with the page name.

### 3. `_site.json` → `variables` — global values, reused on every page

Business identity and contact details — the "variables" a client edits once and
sees everywhere. Global fields use **bare** paths (`name`, `address.street`).
Edited from Settings → Variables. (SEO is a sibling key, `_site.json` → `seo`, see §4.)

Baseline shape (keep what applies, extend after):

```json
{
  "name": "The Client",
  "logo": "/media/logo.svg",
  "phone": "+1 904 555 0100",
  "email": "hello@client.com",
  "address": { "street": "…", "city": "…", "region": "…", "zip": "…", "mapsUrl": "…" },
  "socials": [{ "label": "Instagram", "url": "…" }]
}
```

**Resolution rule:** a field from a frame at route R resolves **page-first** —
if the value exists in `_pages.json[page]` it belongs there, otherwise
`_site.json` → `variables`. Keep a page's top-level keys distinct from the
`variables` keys.

`src/data/seo.ts` (canonical URL, JSON-LD business data) is **per-client
identity config, NOT CMS content** — leave it alone. Not to be confused with
the `seo` key below.

### 4. `_site.json` → `seo` — site + per-page SEO / social metadata

Edited from the in-shell **Settings** view (Site Settings → General, and each
page under Page Settings). The hub writes it **additively** — it never prunes.

```json
{
  "site": {
    "title": "The Client",
    "description": "…",
    "favicon": "/media/favicon.png",
    "ogImage": "/media/og.png",
    "appleTouchIcon": "/media/apple-touch-icon.png",
    "googleAnalytics": "G-XXXXXXXXXX"
  },
  "pages": {
    "home": { "title": "…", "description": "…", "ogImage": "/media/og-home.png" },
    "about": { "title": "…", "description": "…", "ogImage": "" }
  }
}
```

- `site` — site-wide defaults + images (favicon 64×64, `ogImage` / social preview
  1200×630, `appleTouchIcon` 180×180) and the Google Analytics measurement id.
- `pages` — keyed by the same page keys as the `cms.pages` map / `_pages.json`;
  per-page `title` / `description` / `ogImage` override the site defaults.

> **Migration note:** SEO title/description historically lived inline in each
> page object (`_pages.json[page].seo`). The `seo` key is the source of truth; the
> client Astro layout should read from it. Until a project's layout is migrated,
> the old inline `seo` objects still work — the `seo` block is written alongside
> them, never in place of them.

---

## Authoring: bridge components

The reliable way to make markup editable. Import from
`@alisamadiillc/cms-bridge/components`; every component REQUIRES a `field` prop
and emits `data-cms-field` + `data-cms-kind`, so the canvas edits it with zero
guessing.

```astro
---
import {
  Heading1, Heading2, Text, Image, Link, Group, Item,
} from "@alisamadiillc/cms-bridge/components";
import pages from "../../_pages.json";
const home = pages.home;
---

<Heading1 field="hero.heading" value={home.hero.heading} class="…" />
<Text field="hero.text" value={home.hero.text} class="lead" />
<Image field="hero.image" value={home.hero.image} alt={home.hero.imageAlt} />

<!-- Link value is the shared { label, link } object. With no children it
     renders its own editable label span; slot children for custom markup. -->
<Link field="hero.cta" value={home.hero.cta} class="btn" />
<Link field="hero.cta" value={home.hero.cta}>
  <Text as="span" field="hero.cta.label" value={home.hero.cta.label} />
  <Icon name="arrow-right" />
</Link>
```

- `as` picks the tag on `Text`/`Group`/`Item` (`<Text as="span" …/>`); every
  other prop passes straight through to the element.
- **Image** tags the `src`; alt lives in a sibling key (`imageAlt`) and isn't
  tagged.

### Repeated content — `<Group>` + `<Item>`

Wrap a mapped list so the canvas can add/remove/reorder items. Each item's
index goes in the field path.

```astro
<Group field="gallery.images" class="grid">
  {home.gallery.images.map((img, i) => (
    <Item index={i}>
      <Image field={`gallery.images.${i}.src`} value={img.src} alt={img.alt} />
    </Item>
  ))}
</Group>
```

On the canvas a `<Group>` shows a **+ Add** button (adds a copy of the last
item) and each `<Item>` shows **↑ ↓ ✕**. Structural changes reindex every
field path automatically and publish in the same commit — no reload.

### Inline emphasis in a single field

A text field can carry emphasis without splitting into extra fields. Two
markers, both editable and round-tripping through the canvas:

```
`word`     → <span class="cms-hl">word</span>       (accent — style .cms-hl)
**word**   → <span class="cms-mark …">word</span>   (mark — style .cms-mark)
```

Put the markers in the JSON value; it stays one editable string:

```json
{ "hero": { "heading": "Wood-fired **pasta**, made `nightly`" } }
```

Style the base look once in global CSS (`.cms-mark { … }`); override per field
with `markClass` (or `markStyle`):

```astro
<Heading1 field="hero.heading" value={home.hero.heading} markClass="text-brand-600 italic" />
<!-- **pasta** → <span class="cms-mark text-brand-600 italic">pasta</span> -->
```

Text/Heading components also accept **children** instead of `value` when you'd
rather author the markup (`<Heading1 field="hero.heading">Wood-fired
<strong>pasta</strong></Heading1>`); authored `<strong>` / `cms-hl` flatten to
`**` / `` ` `` on the first canvas edit and keep round-tripping. Prefer the
`value` form when you want the emphasis editable from the start.

### SEO

Site and per-page SEO live in `_site.json` → `seo` (§4) — `site` defaults plus a
`pages.<key>` slice per page (`title`, `description`, `ogImage`). Edited from
Settings → General (site) and Settings → Page Settings (per page). The layout
reads them, e.g. `<Layout title={seo.pages.home.title ?? seo.site.title}>`.

---

## Collections

Structured, repeating content. Two kinds, chosen by `path` (full details in
`docs/collections.md`):

**Array collection** — `path` is a `.json` FILE. The whole collection is one
JSON array, edited/published as a single file like `_pages.json`. **Order is
array position** (no `sort_order`). No `route`, no `body`. Default for data
lists (team, partners, workshops, …).

```json
{ "name": "team", "path": "_collections/team.json",
  "fields": [ { "name": "name", "type": "string", "required": true } ] }
```

The site imports the file directly, rendered in order:

```ts
import team from "../../_collections/team.json";   // already ordered — no sort
```

**Directory collection** — `path` is a FOLDER, one file per entry. Needed for
`{slug}` routes and Markdown bodies (blog, stories).

```json
{ "name": "blog", "path": "_collections/blog", "route": "/blog/{slug}",
  "format": "md",
  "fields": [ { "name": "title", "type": "string", "required": true } ] }
```

- `format` (directory only): `"md"` (frontmatter + body, default) or `"json"`.
- `route` (directory only) with `{slug}` gives each entry a canvas tile.
- `fields` drives the create dialog and table columns. Directory collections
  also get a `body` field; array collections don't.
- The site reads the file/folder however it likes; the CMS only needs `path` +
  `fields`. Convert a directory JSON collection with
  `npx cms-bridge collections-to-array`.

---

## Setup checklist

1. Root `_site.json` with `cms.baseUrl` + `cms.pages` (canvas tiles come from here),
   plus the `variables` and `seo` blocks.
2. Root `_pages.json` with the page content.
3. The bridge integration in `astro.config.mjs`:

   ```js
   import cmsBridge from "@alisamadiillc/cms-bridge/astro";
   export default defineConfig({ integrations: [cmsBridge()] });
   ```

That's it — no `.pages.yml`, and no re-init when the dashboard gains features.

---

## Without components (hand-tagged fallback)

Any element with a `data-cms-field` attribute is editable too — the bridge
falls back to heuristics for these, and mixed mode (components + attributes) is
fully supported. When hand-tagging, three strings must be the **same**:

1. the key path in `_pages.json` / `_site.json` → `variables`
2. the component `field` prop OR the `data-cms-field` attribute value
3. the position in the JSON (dot path, list items append their index)

```astro
<h1 data-cms-field="hero.heading">{home.hero.heading}</h1>
<img src={img.src} alt={img.alt} data-cms-field={`gallery.images.${i}.src`} />
```

Prefer components for anything new — they guarantee editability without the
heuristics.

---

## Idempotency rules (MUST respect)

- NEVER rename or renumber an existing `data-cms-field` path or JSON key — the
  CMS and saved drafts reference them.
- Only ADD. Existing values in the JSON always win over defaults.
- After changes, run `npx cms-bridge check` until clean.

## Non-functional / cosmetic changes (AI need not track)

Some edits are pure presentation and carry **no functional meaning** — the CMS
behaves identically before and after. Record them here so a future AI treats
them as noise, not signal, and never over-engineers around them.

- **`pages` key order in `cms.pages`** — controls only the order of canvas tiles.
  Reorder freely (e.g. home → about → sections → legal). No route, key, or
  content changes; nothing else reads the order.
- **Item order in an array-collection file** — the array's order IS the display
  order and the *only* ordering signal (there is no `sort_order` field). Moving
  a line up/down reorders that item on the site; it changes nothing else.

> **Standing rule:** whenever a change turns out to be unnecessary for the AI to
> reason about, add it to this list.

## Wiring a new or partially-wired site

```sh
npx cms-bridge init    # scaffolds the three JSON files + placeholders,
                       # wires astro.config, installs this skill (idempotent)
npx cms-bridge check   # validates the contract; lists what still needs wiring
```

`init` is add-only and safe to re-run: existing JSON keys are never touched, so
hand-edits to `_pages.json` always survive, and an untouched project stays
byte-identical. It does **not** rewrite your markup — wiring pages to fields is
done in the canvas editor.
