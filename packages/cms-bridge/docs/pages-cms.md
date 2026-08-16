# Pages CMS — client project guide (v2)

How a client site is wired to the Pages CMS. The whole contract is three JSON
files plus a set of Astro components — no `.pages.yml`, no schema to maintain.

> **Maintainers:** canonical copy shipped in `@alisamadiillc/cms-bridge`, synced
> into each project by `npx cms-bridge init`. Edit here (`docs/pages-cms.md`),
> publish, re-run init — never hand-edit the synced copy inside a project.

---

## The three files (all in `src/data/`)

### 1. `cms.json` — the manifest (the only config the CMS reads)

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
      "path": "src/data/blog",
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
- `pages` keys ARE the top-level keys in `pages.json`. Each entry becomes a
  canvas tile; its `route` maps a frame back to its page. `title` is optional
  (defaults to the key in Title Case).
- `collections` (optional) — see [Collections](#collections). This tiny field
  list is the ONLY schema left anywhere.

### 2. `pages.json` — all page content, keyed by page name

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

### 3. `site.json` — global content, shown on every page

Business identity and chrome (header/footer). Global fields use **bare** paths
(`name`, `address.street`). Edited from the canvas "Site settings" panel.

Baseline shape (keep what applies, extend after):

```json
{
  "seo": { "title": "…", "description": "…" },
  "name": "The Client",
  "tagline": "…",
  "logo": "/media/logo.svg",
  "phone": "+1 904 555 0100",
  "email": "hello@client.com",
  "address": { "street": "…", "city": "…", "region": "…", "zip": "…", "mapsUrl": "…" },
  "socials": [{ "label": "Instagram", "url": "…" }],
  "footer": { "text": "© The Client" }
}
```

**Resolution rule:** a field from a frame at route R resolves **page-first** —
if the value exists in `pages.json[page]` it belongs there, otherwise
`site.json`. Keep a page's top-level keys distinct from `site.json`'s.

`src/data/seo.ts` (canonical URL, JSON-LD business data) is **per-client
identity config, NOT CMS content** — leave it alone.

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
import pages from "../data/pages.json";
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

Every page has a top-level `seo` object — `{ title, description }` — passed to
the layout: `<Layout title={home.seo.title} description={home.seo.description}>`.
Edited from the per-frame SEO button on the canvas. `site.json.seo` is the
site-wide default.

---

## Collections

Structured, repeating content (blog posts, newsletters). Declared in
`cms.json`; entries are files in `path`, edited from the CMS collection table.

```json
{
  "name": "blog",
  "path": "src/data/blog",
  "route": "/blog/{slug}",
  "format": "md",
  "fields": [
    { "name": "title", "type": "string", "required": true },
    { "name": "date", "type": "date" },
    { "name": "excerpt", "type": "text" },
    { "name": "banner", "type": "image" }
  ]
}
```

- `format`: `"md"` (Markdown — frontmatter + body, the default) or `"json"`.
- `route` with `{slug}` gives each entry a canvas tile; omit for
  non-routed lists.
- `fields` drives the create dialog and table columns. A `body` field is
  always available for the Markdown/long content.
- The site reads the folder however it likes (e.g. Astro content collections /
  an import glob). The CMS only needs `path` + `fields`.

---

## Setup checklist

1. `src/data/cms.json` with `baseUrl` + `pages` (canvas tiles come from here).
2. `src/data/pages.json` + `src/data/site.json` with the content.
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

1. the key path in `pages.json` / `site.json`
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

## Migrating a legacy `.pages.yml` project

```sh
npx cms-bridge migrate                 # → cms.json + pages.json, rewires imports
npx cms-bridge check                   # validates the v2 contract (auto-detected)
npx cms-bridge migrate --delete-legacy # once the v2 canvas round-trips
```

`migrate` merges every page JSON into `pages.json`, builds `cms.json` from the
old `settings`/`preview`/collections, and rewrites
`import home from ".../home.json"` to read from `pages.json`. Legacy files are
kept by default for rollback; rewrite key sections with components afterwards.
