/**
 * cms-report.md writer.
 *
 * The report is a fully self-contained brief for an AI agent: the complete
 * CMS conventions contract is embedded inline (not linked), so
 * `claude "finish cms-report.md"` needs zero other context. The same
 * convention strings are reused by the shipped docs — single source, no drift.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PageAnalysis, ReasonCode, ReportItem } from "../types.js";

// ---------------------------------------------------------------------------
// Conventions contract — single source is docs/conventions.md (shipped in the
// package). Loaded at runtime so the report embeds the full text; the string
// below is only a last-resort fallback if the docs folder is missing.
// ---------------------------------------------------------------------------

/**
 * Load a doc shipped in the package's `docs/` folder. Works from the built CLI
 * (`dist/cli/index.js` → `../../docs`) and from source during tests
 * (`src/cli/core/*.ts` → `../../../docs`). Returns null when not found.
 */
export function loadPackagedDoc(name: string): string | null {
  for (const relative of [`../../docs/${name}`, `../../../docs/${name}`]) {
    try {
      const candidate = fileURLToPath(new URL(relative, import.meta.url));
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf8");
    } catch {
      // keep looking
    }
  }
  return null;
}

export function loadConventionsContract(): string {
  return loadPackagedDoc("conventions.md") ?? FALLBACK_CONTRACT;
}

const FALLBACK_CONTRACT = `## The CMS conventions contract

This project is wired to a git-based CMS. Three things must always be the
**same string**:

1. the key path inside the page's JSON file (\`src/data/<entry>.json\`)
2. the field path in \`.pages.yml\` (nesting of \`fields\` under the entry)
3. the \`data-cms-field\` attribute value in the markup

Example — all three lines describe one field:

\`\`\`
src/data/home.json:      { "hero": { "heading": "Welcome" } }
.pages.yml:              home entry → fields: [{name: hero, type: object, fields: [{name: heading, type: string}]}]
src/pages/index.astro:   <h1 data-cms-field="hero.heading">{home.hero.heading}</h1>
\`\`\`

### Rules

- **Page entries** use section-prefixed dot paths (\`hero.heading\`). The page
  itself is implied by the route — NEVER prefix paths with the page name.
- **Global fields** (\`src/data/site.json\`) use bare paths
  (\`data-cms-field="name"\`, \`data-cms-field="address.street"\`) — the \`site\`
  entry is resolved on every page via \`settings.preview.global: [site]\`.
- **List items append their index**: inside \`.map((item, i) => ...)\` use a
  template literal: \`data-cms-field={\\\`features.items.\${i}.title\\\`}\`.
- **Naming scheme** (auto-generated fields follow this; keep it for manual ones):

  | element | key |
  |---|---|
  | h1 | \`heading\` |
  | h2 / h3 | \`title\` |
  | h4-h6 | \`subtitle\` |
  | p / blockquote / figcaption | \`text\` |
  | short p/span above the heading | \`eyebrow\` |
  | a (link/button) | \`cta\` — an object \`{label, link}\` |
  | img | \`image\` + sibling \`imageAlt\` |

  Collisions get numbered: \`text\`, \`text2\`, \`cta\`, \`cta2\`. The section
  prefix comes from the containing \`<section>\`: its \`data-cms-section\`
  attribute → \`id\` → first heading slug → first meaningful class name.
- **CTA pattern** — links are \`{label, link}\` objects. The \`data-cms-field\`
  goes on an inner \`<span>\` around the label (so the link itself stays
  clickable in edit mode):

  \`\`\`astro
  <a href={home.hero.cta.link} class="btn">
    <span data-cms-field="hero.cta.label">{home.hero.cta.label}</span>
  </a>
  \`\`\`

  In \`.pages.yml\` CTAs use the shared \`link\` component:

  \`\`\`yaml
  components:
    link:
      type: object
      fields:
        - { name: label, label: Button label, type: string }
        - { name: link, label: Button link, type: string, options: { type: url } }
  # in an entry:
  - { name: cta, label: Button, component: link }
  \`\`\`
- **Image pattern** — \`data-cms-field\` tags the src; alt lives in a sibling
  key and is not tagged:

  \`\`\`astro
  <img src={home.hero.image} alt={home.hero.imageAlt} data-cms-field="hero.image" />
  \`\`\`

  In lists, image objects use \`{src, alt}\`:
  \`data-cms-field={\\\`gallery.images.\${i}.src\\\`}\`.
- **SEO** — every page entry has a top-level \`seo\` object placed FIRST:
  \`{ title (string, required), description (text) }\`. Pages pass it to the
  layout: \`<Layout title={menu.seo.title} description={menu.seo.description}>\`.
- **The \`site\` entry is mandatory** in every project: \`name: site\`,
  \`type: file\`, \`path: src/data/site.json\`, \`format: json\`, listed FIRST in
  \`content\`. Baseline field names (use exactly these, omit what doesn't
  apply, extend after): \`seo{title,description}\`, \`name\`, \`tagline\`,
  \`logo\`, \`phone\` (\`options.type: tel\`), \`email\` (\`options.type: email\`),
  \`address{street,city,region,zip,mapsUrl}\`, \`socials[]{label,url}\`,
  \`footer{text}\`.
- **\`src/data/seo.ts\` is NOT CMS content** — it is per-client identity config
  (canonical URL, JSON-LD business data). Leave it alone.

### .pages.yml field syntax reference

Field types: \`string\`, \`text\` (multi-line), \`rich-text\`, \`number\`,
\`boolean\`, \`date\`, \`select\` (\`options.values\`), \`image\`, \`file\`, \`code\`,
\`reference\`, \`uuid\`, plus \`object\` (requires \`fields\`) and \`block\`.
Common field keys: \`name\` (required), \`label\`, \`description\`, \`required\`,
\`default\`, \`list\` (true or \`{min, max, collapsible}\`), \`options\`
(\`options.type: url|email|tel\` for typed strings), \`component\` (instead of
\`type\`, references a shared component).

Entries: \`{name, type: file|collection, path, label, fields}\`. Groups:
\`{name, type: group, items: [...]}\` (sidebar folder only).
\`settings.preview.paths\` maps entry name → route; \`settings.preview.global\`
lists entries available on every page (the \`site\` entry).

### Idempotency rules (MUST respect)

- NEVER rename or renumber an existing \`data-cms-field\` path, JSON key, or
  \`.pages.yml\` field — the CMS and saved drafts reference them.
- Only ADD. Existing values in JSON always win over generated defaults.
- After every batch of fixes, run \`npx cms-bridge check\` — repeat until the
  report is clean or every remaining item is intentionally skipped.
`;

// ---------------------------------------------------------------------------
// Per-reason-code fix recipes.
// ---------------------------------------------------------------------------

export const REASON_RECIPES: Record<ReasonCode, { title: string; recipe: string }> = {
  R0: {
    title: "File reverted — automated edit failed verification",
    recipe:
      "The codemod aborted this file to avoid breaking it. Apply the conventions manually: extract static text to the page JSON, tag elements with data-cms-field, add the fields to .pages.yml.",
  },
  R1: {
    title: "Expression-driven text",
    recipe: `Text comes from an expression the script can't trace. If the value is
content, move it into the page JSON and render it from there:

\`\`\`astro
<!-- before -->
<p>{someComputedThing}</p>
<!-- after: value now lives in src/data/<entry>.json under about.text -->
<p data-cms-field="about.text">{about.text}</p>
\`\`\`

If it's genuinely computed (dates, counts), leave it and delete the item.`,
  },
  R2: {
    title: "Mixed static text + inline markup",
    recipe: `The element mixes text with tags (\`<p>Hi <strong>x</strong></p>\`).
Options: (a) split into separate fields; (b) keep one field and re-shape the
markup so each text run is its own tagged element; (c) if formatting must be
client-editable, use a \`rich-text\` field and render with \`set:html\`.`,
  },
  R3: {
    title: "Loop over non-JSON data",
    recipe: `A \`.map()\` renders content from a frontmatter const or prop. Move the
array into the page JSON and use indexed template-literal paths:

\`\`\`astro
---
import home from "../data/home.json";
---
{home.features.items.map((item, i) => (
  <li>
    <h3 data-cms-field={\`features.items.\${i}.title\`}>{item.title}</h3>
    <p data-cms-field={\`features.items.\${i}.text\`}>{item.text}</p>
  </li>
))}
\`\`\`

In .pages.yml the list is one object field with \`list: true\`:

\`\`\`yaml
- name: features
  type: object
  fields:
    - name: items
      label: Items
      type: object
      list: { collapsible: { summary: "{fields.title}" } }
      fields:
        - { name: title, label: Title, type: string }
        - { name: text, label: Text, type: text }
\`\`\``,
  },
  R4: {
    title: "Text inside a conditional",
    recipe:
      "Text renders under a ternary/&&. If both branches are content, extract each branch to its own JSON field and tag each branch's element. If the condition is UI state, leave it.",
  },
  R5: {
    title: "Component file content",
    recipe:
      "Content lives in a shared component (src/components/*.astro). Extract its text to site.json (if global — header/footer) or accept a cmsPath prop and thread section-prefixed paths from each page. Global fields use bare data-cms-field paths.",
  },
  R6: {
    title: "Chrome string (nav / form / button / placeholder / aria)",
    recipe:
      "UI chrome vs content is a judgment call. Client-facing marketing copy (nav labels, button text like 'Order Online') → usually extract to site.json. Functional strings (form validation, aria-labels, placeholders) → usually leave hardcoded. When extracting nav arrays, follow the R3 recipe against site.json with bare paths.",
  },
  R7: {
    title: "Static alt on dynamic-src image",
    recipe:
      "The image src is computed but alt is static. If the image should be client-editable, move both src and alt into JSON ({image, imageAlt} or {src, alt} in lists). Otherwise leave.",
  },
  R8: {
    title: "Content-shaped frontmatter const",
    recipe:
      "A frontmatter const holds an array/object of display strings. Move it into the page JSON (or site.json if shared), import the JSON, and render with indexed data-cms-field paths (see R3).",
  },
  R9: {
    title: "Layout SEO props not migratable",
    recipe:
      "The page passes dynamic title/description to the layout. Ensure the page JSON has a top-level seo {title, description} object (FIRST in the entry fields) and pass <Layout title={entry.seo.title} description={entry.seo.description}>.",
  },
  R10: {
    title: "astro.config not edited",
    recipe: `Add the bridge integration manually:

\`\`\`js
import cmsBridge from "@alisamadiillc/cms-bridge/astro";
export default defineConfig({
  integrations: [cmsBridge(), /* existing */],
});
\`\`\``,
  },
};

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

const ORDER: ReasonCode[] = ["R0", "R3", "R8", "R5", "R2", "R1", "R4", "R9", "R7", "R10", "R6"];

export function buildReport(
  analyses: PageAnalysis[],
  extraItems: ReportItem[] = []
): string {
  const items = [
    ...analyses.flatMap((analysis) => analysis.reports),
    ...extraItems,
  ];

  const byCode = new Map<ReasonCode, ReportItem[]>();
  for (const item of items) {
    const list = byCode.get(item.code) ?? [];
    list.push(item);
    byCode.set(item.code, list);
  }
  for (const list of byCode.values()) {
    list.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  }

  const lines: string[] = [];
  lines.push("# CMS adoption report");
  lines.push("");
  lines.push(
    "Generated by `cms-bridge`. This file is **self-contained**: everything an AI agent needs to finish CMS-wiring this project is below — conventions, fix recipes, and the item list. Work through the items, then run `npx cms-bridge check` and repeat until clean."
  );
  lines.push("");
  lines.push(`_${items.length} item(s) across ${analyses.length} page(s)._`);
  lines.push("");
  lines.push(loadConventionsContract());
  lines.push("");
  lines.push("## Fix recipes and items");
  lines.push("");

  if (items.length === 0) {
    lines.push("Nothing to do — every scanned element is either CMS-wired or intentionally out of scope. ✅");
  }

  for (const code of ORDER) {
    const list = byCode.get(code);
    if (!list?.length) continue;
    const recipe = REASON_RECIPES[code];
    lines.push(`### ${code} — ${recipe.title} (${list.length})`);
    lines.push("");
    lines.push(recipe.recipe);
    lines.push("");
    for (const item of list) {
      const suggestion = item.suggestedKey ? ` → suggested key: \`${item.suggestedKey}\`` : "";
      lines.push(`- \`${item.file}:${item.line}\` — \`${item.excerpt.replace(/`/g, "'")}\`${suggestion}${item.note ? ` — ${item.note}` : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function writeReport(
  root: string,
  analyses: PageAnalysis[],
  extraItems: ReportItem[] = []
): { reportPath: string; itemCount: number } {
  const reportPath = path.join(root, "cms-report.md");
  const content = buildReport(analyses, extraItems);
  fs.writeFileSync(reportPath, content);
  const itemCount =
    analyses.reduce((sum, analysis) => sum + analysis.reports.length, 0) +
    extraItems.length;
  return { reportPath, itemCount };
}
