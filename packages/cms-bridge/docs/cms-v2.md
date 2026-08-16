# CMS v2 — the three-file contract (schema-less)

CMS v2 removes `.pages.yml` entirely. The dashboard detects the engine per
repo: `src/data/cms.json` present → v2; `.pages.yml` present → legacy (see
`pages-cms.md`). A migrated repo may keep `.pages.yml` around for rollback —
the manifest wins.

## The three files (all in `src/data/`)

### 1. `cms.json` — the manifest (the only config the CMS reads)

```json
{
  "version": 1,
  "baseUrl": "https://client-site.com",
  "media": { "input": "public/media", "output": "/media" },
  "pages": {
    "home": { "route": "/" },
    "menu": { "route": "/menu" },
    "story": { "route": "/our-story", "title": "Our Story" }
  },
  "collections": [
    {
      "name": "blog",
      "path": "src/content/blog",
      "route": "/blog/{slug}",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "date", "type": "date", "required": true },
        { "name": "banner", "type": "image" }
      ]
    }
  ]
}
```

- `pages` keys ARE the `pages.json` top-level keys. Each entry becomes a
  canvas tile; the route maps a frame back to its page for field resolution.
- `title` optional — defaults to the key in Title Case.
- `collections` (optional): entries are Markdown files (frontmatter + body)
  in `path`; `fields` describes the frontmatter shown in the create dialog
  and table. This is the ONLY schema left anywhere, and it is tiny.

### 2. `pages.json` — all page content, keyed by page name

```json
{
  "home": {
    "hero": { "heading": "…", "cta": { "label": "…", "link": "/menu" } },
    "seo": { "title": "…", "description": "…" }
  },
  "menu": { "…": "…" }
}
```

One file, one GitHub fetch, one publish commit. Field paths in markup stay
page-relative (`hero.heading`) — the page is implied by the route, exactly as
before. SEO stays convention-based: `seo.title` / `seo.description` per page.

### 3. `site.json` — global content (unchanged from legacy)

Business name, contact, footer, socials. Bare field paths (`name`,
`footer.text`). Rendered on every page; edited via the Site settings sheet.

**Resolution rule:** a field from a frame at route R resolves page-first —
if the value exists in `pages.json[page]` it belongs there, otherwise
`site.json`. Keep a page's top-level keys distinct from `site.json`'s.

## Bridge components (the reliable way to tag markup)

```astro
---
import {
  Heading1, Heading2, Heading3, Text, Image, Link, Group, Item,
} from "@alisamadiillc/cms-bridge/components";
import pages from "../data/pages.json";
const home = pages.home;
---

<Heading1 field="hero.heading" value={home.hero.heading} class="…" />
<Text field="hero.text" value={home.hero.text} class="…" />
<Image field="hero.image" value={home.hero.image} alt={home.hero.imageAlt} />

<!-- Link: value is the shared { label, link } object. With no children it
     renders its own editable label span. -->
<Link field="hero.cta" value={home.hero.cta} class="btn" />
<Link field="hero.cta" value={home.hero.cta}>
  <Text as="span" field="hero.cta.label" value={home.hero.cta.label} />
  <Icon name="arrow-right" />
</Link>

<!-- Repeated content: Group wraps the mapped output, Item wraps each item. -->
<Group field="gallery.images" class="grid">
  {home.gallery.images.map((img, i) => (
    <Item index={i}>
      <Image field={`gallery.images.${i}.src`} value={img.src} alt={img.alt} />
    </Item>
  ))}
</Group>
```

Every component REQUIRES `field` (build fails without it) and emits
`data-cms-field` + `data-cms-kind`. The kind attribute is what makes elements
**always** editable on the canvas — the bridge trusts it outright, no leaf
heuristics, no schema, no whitelist. `as` picks the tag on `Text`/`Group`/
`Item`; every other prop passes through to the element.

Hand-tagged `data-cms-field` attributes (without components) still work — the
bridge falls back to the legacy heuristics for them. Components are the
convention for new and edited sections.

### Inline emphasis in text fields

A single text field can carry inline emphasis without splitting into extra
fields — two markers, both editable and round-tripping through the canvas:

```
`word`     → <span class="cms-hl">word</span>            (accent — style .cms-hl)
**word**   → <span class="cms-mark …">word</span>        (mark — style .cms-mark)
```

Put them in the JSON value and they stay one editable string:

```json
{ "hero": { "heading": "Wood-fired **pasta**, made `nightly`" } }
```

```astro
<Heading1 field="hero.heading" value={home.hero.heading} />
```

Style the base look once in global CSS (`.cms-mark { … }`), and override per
field with the `markClass` (and `markStyle`) prop:

```astro
<Heading1
  field="hero.heading"
  value={home.hero.heading}
  markClass="text-brand-600 italic"
/>
<!-- **pasta** → <span class="cms-mark text-brand-600 italic">pasta</span> -->
```

The class/style ride on the host's `data-cms-mark-class` / `-style`
attributes, so when a heading is edited on the canvas the bridge rebuilds the
exact span — the styling is never lost, and `pages.json` keeps the plain
`**pasta**` source.

Text/Heading components also accept **children** instead of `value`, for when
you want to author the markup in the template:

```astro
<Heading1 field="hero.heading">Wood-fired <strong>pasta</strong></Heading1>
```

Authored `<strong>` / `<span class="cms-hl">` flatten to `**` / `` ` ``
source on the first canvas edit and are stored back into the single field
value, so they keep round-tripping. Prefer the `value` form when you want the
emphasis editable from the start.

### Group structural editing (canvas)

On the canvas, a `<Group>` shows an **+ Add** button (top-right, on hover)
and each `<Item>` shows **↑ ↓ ✕** controls. Add duplicates the last item;
all edits go through the CMS (the draft array is spliced there), the page
mutates its own DOM in place and every field path reindexes automatically —
no reload. Structural changes live in the same draft as text edits and
publish in the same single commit.

## What the dashboard needs from a v2 site

1. `src/data/cms.json` with `baseUrl` + `pages` (canvas tiles come from here).
2. `src/data/pages.json` + `src/data/site.json` with the content.
3. The bridge integration in `astro.config.mjs` (`cmsBridge()`), unchanged.

That's it. No `.pages.yml`, no re-init when the dashboard gains features.

## Migrating a legacy project

```sh
npx cms-bridge migrate            # generates cms.json + pages.json, rewires imports
npx cms-bridge check              # validates the v2 contract (auto-detected)
npx cms-bridge migrate --delete-legacy   # once the v2 canvas round-trips
```

`migrate` merges every non-`site` page JSON into `pages.json` under its
entry name, builds `cms.json` from `settings.baseUrl` / `preview.paths` /
`media` / collection schemas, and rewrites
`import home from ".../data/home.json"` into
`import pages from ".../data/pages.json"; const home = pages.home;`.
Legacy files are kept by default for rollback. `check` on a v2 project
validates the manifest, page/site key collisions, and that every static
`data-cms-field` in `src/` resolves to a value in pages.json or site.json.

Optionally rewrite key sections with bridge components afterwards — mixed
mode (components + hand-tagged attributes) is fully supported.
