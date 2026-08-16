## The CMS conventions contract (v2)

This project is wired to a git-based CMS. Content lives in three JSON files
under `src/data/` — `cms.json` (manifest), `pages.json` (all pages), and
`site.json` (global). Markup is made editable with the bridge components (or,
as a fallback, a `data-cms-field` attribute). See `pages-cms.md` for the full
guide.

Two things must always be the **same string**:

1. the key path inside `pages.json` (page-relative) or `site.json` (bare)
2. the component `field` prop — or the `data-cms-field` attribute value

```
pages.json:            { "home": { "hero": { "heading": "Welcome" } } }
src/pages/index.astro: <Heading1 field="hero.heading" value={home.hero.heading} />
```

### Rules

- **Page fields** use section-prefixed dot paths (`hero.heading`). The page is
  implied by its route — NEVER prefix a path with the page name.
- **Global fields** (`site.json`) use bare paths (`name`, `address.street`) —
  resolved on every page.
- **List items append their index** inside `.map((item, i) => …)`:

  ```astro
  <Text field={`features.items.${i}.title`} value={item.title} />
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

  Collisions get numbered: `text`, `text2`, `cta`, `cta2`.

- **CTA pattern** — links are `{label, link}` objects; use `<Link>`:

  ```astro
  <Link field="hero.cta" value={home.hero.cta} class="btn" />
  ```

- **Image pattern** — `<Image>` tags the src; alt lives in a sibling key
  (`imageAlt`), untagged:

  ```astro
  <Image field="hero.image" value={home.hero.image} alt={home.hero.imageAlt} />
  ```

- **Repeated content** — wrap a mapped list in `<Group field="…">` with each
  item in `<Item index={i}>` so the canvas can add/remove/reorder.
- **Inline emphasis** — in a text value, `` `word` `` → `.cms-hl` (accent) and
  `**word**` → `.cms-mark` (mark; style once, override per field with
  `markClass`). Both round-trip through canvas editing.
- **SEO** — every page has a top-level `seo` object `{ title, description }`
  passed to the layout. `site.json.seo` is the site-wide default.
- **The `site.json` file is mandatory.** Baseline keys (use these, omit what
  doesn't apply, extend after): `seo{title,description}`, `name`, `tagline`,
  `logo`, `phone`, `email`, `address{street,city,region,zip,mapsUrl}`,
  `socials[]{label,url}`, `footer{text}`.
- **`src/data/seo.ts` is NOT CMS content** — per-client identity config
  (canonical URL, JSON-LD business data). Leave it alone.

### Idempotency rules (MUST respect)

- NEVER rename or renumber an existing `data-cms-field` path or JSON key — the
  CMS and saved drafts reference them.
- Only ADD. Existing values in the JSON always win over generated defaults.
- After every batch of changes, run `npx cms-bridge check` until clean.
