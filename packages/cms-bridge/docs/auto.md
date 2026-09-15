# Auto mode — build-time CMS wiring for plain HTML

Write normal HTML anywhere under `src/` — pages, components, layouts. No
bridge components, no `field=` props, no manual JSON edits, and **no
`data-cms-*` attributes in the source, ever**. Sources stay clean plain
HTML; all CMS wiring exists only in the built/served output. At dev/build
time the bridge:

1. **Binds** every safe element — headings, paragraphs, links, images, AND
   chrome (buttons, form labels, nav/header/footer text) — to a pages-JSON
   key and injects `data-cms-field` / `data-cms-kind` into the transformed
   output, the exact contract the bridge components emit, so the CMS canvas
   arms them unchanged. Input placeholders stay developer-owned.
   - **Mixed inline markup** (`<h1>Every forest <span class="text-fern">is a
     galaxy</span></h1>`) becomes ONE rich field: spans → `` `accent` ``,
     strong → `**mark**`; each source span's own classes are preserved per
     occurrence (`data-cms-hl-class`), so clients can move/edit accents and
     the design survives. A sole `<span>` label with no surrounding text
     (`<button><span>Send</span></button>`) is wired as a plain field.
   - **Component slot text** (`<Eyebrow>A field guide</Eyebrow>`) is wrapped
     in an injected `<span data-cms-field>` in the output — component labels
     are editable without touching the component.
   - **Frontmatter const arrays** that are pure literals (`const stats =
     [{value, label}, …]`) are LIFTED: real items seeded into the pages JSON
     under `<name>_<rand>`, the const rewritten in the output with an
     array-checked fallback, and their `.map()`s wired. `.slice(a).map()`
     windows get member fields with absolute indices (group add/remove is
     disabled for sliced maps). Arrays referencing code are left alone.
     Lifted array literals are TWO-WAY SYNCED like scalars: a hub edit
     rewrites the source const on the next build/dev pass, a dev edit of the
     literal overwrites the JSON — source and JSON never disagree.
     After a build that rewrote sources, the PROJECT's prettier runs on
     just those files automatically — synced literals always match repo
     style. (No prettier installed → skipped.)
2. **Substitutes** values from the pages JSON when the key exists — **JSON
   always wins** once a key is seeded.
3. **Seeds** missing keys into the pages JSON from the markup literals
   (add-only — an existing value is never overwritten).
4. **Wires `.map()` loops** over page-JSON arrays into fully canvas-editable
   groups (add / remove / reorder) — see [Loops](#loops).
5. **Marks variable-bound elements** (`siteData.variables.*`) with
   `data-cms-variant="<path>"` — green in the canvas, click opens the hub
   Variables page. Never inline-editable, never seeded — `_site.json` is
   edited only through hub Settings. (Indirect helpers like a `siteConfig`
   module still need a manual `<Region type="variant">`.)

## Enable

```js
// astro.config.mjs
import cmsBridge from "@alisamadiillc/cms-bridge/astro";

export default defineConfig({
  integrations: [cmsBridge({ auto: true })],
});
```

Default is `auto: false` — zero behavior change for existing projects.

## Field IDs — the JSON is the ID store

Contract marker: `_site.json → cms.version: 2` = the FLAT contract described
here (version 1 keeps the older nested per-page layout for legacy repos).

A fresh element gets a random ID `<role>_<4 base36>` — `heading_k4f2`,
`text_x8n1`, `cta_r7t3`, `image_p2m9`. The role comes from the tag (h1 →
`heading`, h2/h3 → `title`, h4–6 → `subtitle`, p/button/label → `text`/
`eyebrow`, a → `cta`, img → `image`). IDs are **not meant to be read** — the
JSON is machine-managed and the hub labels fields by role ("Heading",
"Text", "Link", "Image").

`_pages.json` is **one flat global map** — no page nesting; every key is
unique across the whole site (a build-wide claim registry guarantees two
files never share a key, even for identical literals):

```json
{
  "heading_k4f2": "Get in touch",
  "text_x8n1": "Have a question?",
  "cta_r7t3": { "label": "Contact us", "link": "/contact" },
  "image_p2m9": "/media/hero.jpg",
  "image_p2m9Alt": "The team",
  "features_gr1d": [{ "title": "…", "text": "…" }]
}
```

Compound shapes are unchanged: a cta is a `{label, link}` object (the output
attr carries the `.link` leaf), an image keeps its `<id>Alt` sibling.

**How keys stay stable with nothing in the source:** the two-way dev sync
keeps each element's literal equal to its JSON value, so the value itself
identifies the element. Every transform re-binds deterministically:

1. *manual* — a hand-written `data-cms-field` in the source self-pins
   (supported, never renamed — just not required);
2. *legacy* — the old readable positional key resolves in the JSON → reused
   (existing repos keep `hero.heading` etc. untouched);
3. *value* — element literal equals an unclaimed ID's value, role-compatible
   → the key follows its content, so **reordering elements never shifts
   keys**;
4. *ordinal* — nth unmatched element of a role ↔ nth unclaimed key: covers
   editing a literal in place (key kept; the JSON value still wins in the
   output until the next dev-sync round trip updates it);
5. *mint* — anything left gets a fresh random ID and its literal seeded.

Duplicating an element (copy-paste) gives the copy a new key.

**`_fields.json` — persisted ownership (commit it).** A machine-owned root
file mapping each source file to the keys it bound, rewritten on every
transform. It's what makes the CLIENT FLOW work: the hub edits a value →
the element's literal no longer matches → the cold build's ordinal fallback
rebinds within the file's persisted keys and the edit renders — no
duplicate key. It also hard-scopes files so one file can never steal
another's keys. Never hand-edit; commit alongside `_pages.json`. Deleted →
regenerated next build (but a pending hub edit made before regeneration
would re-seed under a fresh key, so don't wipe both at once).

## Loops

Write a plain `.map()` over a pages-JSON array — simple divs, no components.
The array key in the JSON is machine-suffixed (`features_gr1d`); you write
the plain name and the build **rewrites the accessor in the output**:

```astro
---
import pages from "_pages.json";
---
<div class="grid">
  {pages.features.map((feature) => (
    <div class="card">
      <h2>{feature.title}</h2>
      <p>{feature.text}</p>
      <a href={feature.link}>More</a>
    </div>
  ))}
</div>
```

(`const feats = pages.features` frontmatter bindings work too — the RHS is
rewritten. Non-`.astro` code reading the array must find the key by prefix:
`Object.entries(pages).find(([k, v]) => k.startsWith("features_") && Array.isArray(v))`.)

The transform wires the full group contract into the output (host
`data-cms-field="features" data-cms-kind="group"`, item root
`data-cms-item={i}` — the index param is added in-memory if missing — and
member fields ``data-cms-field={`features.${i}.title`}``). Canvas
add/remove/reorder work exactly as with the old `<Group>`/`<Item>`.

- The mapped array must come straight off the pages import (`pages.<name>`
  inline, or one frontmatter hop). Computed locals and nested item loops are
  skipped (wire manually if needed).
- **New list bootstrap:** mapping over a key that doesn't exist yet seeds ONE
  placeholder item shaped from the accessors you used (`feature.title` →
  `{ "title": "Title" }`) — zero JSON authoring; edit it in the canvas.
- Array keys are `<devName>_<rand>` — the name comes from your code, the
  suffix keeps them unique+random; rediscovered per build by prefix.
- Single-root parenthesized arrow bodies only; anything else is reported by
  `check` for manual wiring.

## Workflow

1. Author plain HTML. Run `dev` (or `build`) locally — keys get seeded into
   the pages JSON (`_pages.json`, or legacy `src/data/pages.json`) and
   ownership into `_fields.json`.
2. **Commit both JSON files** (and any literal syncs in sources). CI
   builds just read.
3. Clients edit in the hub as usual — a rebuild renders their edits even if
   no dev session ran in between.

## Two-way dev sync — source and JSON never disagree

While the dev server runs, each bound literal and its JSON value are kept
identical (last edit wins):

- **Edit the JSON** (hand or hub) → the `.astro` literal is rewritten to
  match; Astro's own HMR reloads the page. (This writes literal VALUES into
  the source — never attributes.)
- **Edit the HTML** → the JSON value is overwritten to match.

Both directions compare-before-write, so each edit settles in one round
trip. A brand-new element is invisible to sync until its first transform
seeds its key — one page load in dev.

Values that can't live as a plain literal (`{`, `<`, quotes, rich
`` `accent` ``/`**bold**` markers) skip the source rewrite; render-time
substitution still applies them.

**Builds sync literals too** (flat contract): a plain `build` after a hub
edit substitutes the value into the rendered output AND rewrites the source
literal to match — source and JSON never disagree, dev session or not.
(Read-only CI skips the source write; rendering is unaffected.)

## Limitations

- Scope: static text, links, images, chrome, variables marking, and
  pages-JSON `.map()` loops in ANY `src/**/*.astro` file. Conditionals,
  mixed inline markup, and framework islands are untouched — wire those
  manually (see `check`'s R-codes) or via the canvas.
- Dynamic routes (`[slug].astro`) are skipped.
- Deleting a key from the JSON re-seeds the element under a NEW id (the old
  binding is gone) — treat the JSON as machine-owned.
- `enabled` builds ship the `data-cms-*` attributes to all visitors (small,
  inert).

## `cms-bridge check`

Auto mode is detected from the config (or force with `--auto`). Reports
`N field(s) auto-wired` and warns for elements whose keys aren't seeded in
the committed JSON yet (run dev/build locally and commit).
