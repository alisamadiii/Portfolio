## The CMS conventions contract (v2)

This project is wired to a git-based CMS. Content lives in JSON files under
`src/data/` — `cms.json` (manifest), `pages.json` (all pages), `variables.json`
(global values), and `seo.json` (SEO). Markup is made editable with the bridge
components (or, as a fallback, a `data-cms-field` attribute). See `pages-cms.md`
for the full guide.

Two things must always be the **same string**:

1. the key path inside `pages.json` (page-relative) or `variables.json` (bare)
2. the component `field` prop — or the `data-cms-field` attribute value

```
pages.json:            { "home": { "hero": { "heading": "Welcome" } } }
src/pages/index.astro: <Heading1 field="hero.heading" value={home.hero.heading} />
```

### Rules

- **Page fields** use section-prefixed dot paths (`hero.heading`). The page is
  implied by its route — NEVER prefix a path with the page name.
- **Global fields** (`variables.json`) use bare paths (`name`, `address.street`)
  — resolved on every page.
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
- **Region markers** — mark a whole region with `<Region type="…">`. It is
  **Slot-style**: it renders its single root child and merges a `data-cms-*` marker
  onto that child's opening tag — no wrapper element. Requires one root child.
  - `<Region type="collection" name="…">` — a region rendered from a `cms.json`
    collection. Purple outline + a "✎ Edit collection" button that opens the
    collection's editor; entries are edited on the collection page, not inline
    (unlike `<Group>`). `name` required.
  - `<Region type="variant" variantName="…">` — green outline. Clicking it opens
    Settings › Variables and flashes the variable whose path equals `variantName`.
  - `<Region type="blog">` — yellow outline. Clicking it opens the Blog settings
    page. Prop-less (there is one blog).
- **Canvas outline legend** — in edit mode the bridge outlines content by kind:
  **green** = inline-editable field/group + a `variant` region, **purple** = a
  `collection` region, **yellow** = a `blog` region, **red** (faint, persistent) =
  text with no `data-cms-*` wiring, i.e. not editable (a hint to wire the element,
  never shown on the live site).
- **Typed field paths** — the package types `field` as a plain `string`; it does
  not constrain paths. A site that wants autocompleted, typo-checked paths adds a
  tiny typed helper of its own and passes its result into `field`:

  ```ts
  // src/lib/cms.ts — page-relative dot-path builder over the site's pages.json
  import pages from "../data/pages.json";
  type DotPaths<T> = T extends readonly (infer E)[]
    ? `${number}` | `${number}.${DotPaths<E>}`
    : T extends object
      ? { [K in Extract<keyof T, string>]: K | `${K}.${DotPaths<T[K]>}` }[Extract<keyof T, string>]
      : never;
  export function field<P extends keyof typeof pages>(_page: P) {
    return <K extends DotPaths<(typeof pages)[P]>>(path: K): K => path;
  }
  ```
  ```astro
  ---
  import { field } from "../lib/cms";
  const f = field("about");            // paths scoped to the about page
  ---
  <Image field={f("story.image")} value={about.story.image} alt={about.story.imageAlt} />
  <Text  field={f(`items.${i}.name`)} value={svc.name} />
  ```
  Compile-time only — `field` stays a plain string at runtime. The helper lives in
  the site, not the package, so each site owns its own field vocabulary.

  > **Maintainer note.** Component props (and the required-prop checks for
  > `<Region type>`, `<Item index>`, `<Text field>`, etc.) are typed
  > from `components/index.d.ts` — the `types` target of the `./components`
  > export. It exists because Astro does **not** generate prop types for `.astro`
  > components imported from `node_modules` (it only worked while the package was
  > `pnpm link`ed). Keep that file in sync with each `*.astro` `Props`.
- **Inline emphasis** — in a text value, `` `word` `` → `.cms-hl` (accent) and
  `**word**` → `.cms-mark` (mark; style once, override per field with
  `markClass`). Both round-trip through canvas editing.
- **SEO** — site + per-page SEO live in `seo.json` (`site` defaults and a
  `pages.<key>` slice each: `title`, `description`, `ogImage`), edited from the
  Settings view — not in `variables.json`.
- **`variables.json`** holds reusable global values. Baseline keys (use these,
  omit what doesn't apply, extend after): `name`, `logo`, `phone`, `email`,
  `address{street,city,region,zip,mapsUrl}`, `socials[]{label,url}`.
- **`src/data/seo.ts` is NOT CMS content** — per-client identity config
  (canonical URL, JSON-LD business data). Leave it alone.

### Idempotency rules (MUST respect)

- NEVER rename or renumber an existing `data-cms-field` path or JSON key — the
  CMS and saved drafts reference them.
- Only ADD. Existing values in the JSON always win over generated defaults.
- After every batch of changes, run `npx cms-bridge check` until clean.
