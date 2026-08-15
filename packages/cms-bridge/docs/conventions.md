## The CMS conventions contract

This project is wired to a git-based CMS. Three things must always be the
**same string**:

1. the key path inside the page's JSON file (`src/data/<entry>.json`)
2. the field path in `.pages.yml` (nesting of `fields` under the entry)
3. the `data-cms-field` attribute value in the markup

Example — all three lines describe one field:

```
src/data/home.json:      { "hero": { "heading": "Welcome" } }
.pages.yml:              home entry → fields: [{name: hero, type: object, fields: [{name: heading, type: string}]}]
src/pages/index.astro:   <h1 data-cms-field="hero.heading">{home.hero.heading}</h1>
```

### Rules

- **Page entries** use section-prefixed dot paths (`hero.heading`). The page
  itself is implied by the route — NEVER prefix paths with the page name.
- **Global fields** (`src/data/site.json`) use bare paths
  (`data-cms-field="name"`, `data-cms-field="address.street"`) — the `site`
  entry is resolved on every page via `settings.preview.global: [site]`.
- **List items append their index**: inside `.map((item, i) => ...)` use a
  template literal:

  ```astro
  <h3 data-cms-field={`features.items.${i}.title`}>{item.title}</h3>
  ```

- **Naming scheme** (auto-generated fields follow this; keep it for manual ones):

  | element                        | key                               |
  | ------------------------------ | --------------------------------- |
  | h1                             | `heading`                         |
  | h2 / h3                        | `title`                           |
  | h4-h6                          | `subtitle`                        |
  | p / blockquote / figcaption    | `text`                            |
  | short p/span above the heading | `eyebrow`                         |
  | a (link/button)                | `cta` — an object `{label, link}` |
  | img                            | `image` + sibling `imageAlt`      |

  Collisions get numbered: `text`, `text2`, `cta`, `cta2`. The section
  prefix comes from the containing `<section>`: its `data-cms-section`
  attribute → already-tagged fields' first path segment → `id` → first heading
  slug → first meaningful class name.

- **CTA pattern** — links are `{label, link}` objects. The `data-cms-field`
  goes on an inner `<span>` around the label (so the link itself stays
  clickable in edit mode):

  ```astro
  <a href={home.hero.cta.link} class="btn">
    <span data-cms-field="hero.cta.label">{home.hero.cta.label}</span>
  </a>
  ```

  In `.pages.yml` CTAs use the shared `link` component:

  ```yaml
  components:
    link:
      type: object
      fields:
        - { name: label, label: Button label, type: string }
        - { name: link, label: Button link, type: string, options: { type: url } }
  # in an entry:
  - { name: cta, label: Button, component: link }
  ```

- **Image pattern** — `data-cms-field` tags the src; alt lives in a sibling
  key and is not tagged:

  ```astro
  <img src={home.hero.image} alt={home.hero.imageAlt} data-cms-field="hero.image" />
  ```

  In lists, image objects use `{src, alt}`:

  ```astro
  <img src={img.src} alt={img.alt} data-cms-field={`gallery.images.${i}.src`} />
  ```

- **SEO** — every page entry has a top-level `seo` object placed FIRST:
  `{ title (string, required), description (text) }`. Pages pass it to the
  layout: `<Layout title={menu.seo.title} description={menu.seo.description}>`.
- **The `site` entry is mandatory** in every project: `name: site`,
  `type: file`, `path: src/data/site.json`, `format: json`, listed FIRST in
  `content`. Baseline field names (use exactly these, omit what doesn't
  apply, extend after): `seo{title,description}`, `name`, `tagline`,
  `logo`, `phone` (`options.type: tel`), `email` (`options.type: email`),
  `address{street,city,region,zip,mapsUrl}`, `socials[]{label,url}`,
  `footer{text}`.
- **`src/data/seo.ts` is NOT CMS content** — it is per-client identity config
  (canonical URL, JSON-LD business data). Leave it alone.

### .pages.yml field syntax reference

Field types: `string`, `text` (multi-line), `rich-text`, `number`,
`boolean`, `date`, `select` (`options.values`), `image`, `file`, `code`,
`reference`, `uuid`, plus `object` (requires `fields`) and `block`.
Common field keys: `name` (required), `label`, `description`, `required`,
`default`, `list` (true or `{min, max, collapsible}`), `options`
(`options.type: url|email|tel` for typed strings), `component` (instead of
`type`, references a shared component).

Entries: `{name, type: file|collection, path, label, fields}`. Groups:
`{name, type: group, items: [...]}` (sidebar folder only).
`settings.preview.paths` maps entry name → route; `settings.preview.global`
lists entries available on every page (the `site` entry).

### Idempotency rules (MUST respect)

- NEVER rename or renumber an existing `data-cms-field` path, JSON key, or
  `.pages.yml` field — the CMS and saved drafts reference them.
- Only ADD. Existing values in JSON always win over generated defaults.
- After every batch of fixes, run `npx cms-bridge check` — repeat until the
  report is clean or every remaining item is intentionally skipped.
