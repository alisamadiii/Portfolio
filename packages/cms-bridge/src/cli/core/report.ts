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

const FALLBACK_CONTRACT = `## The CMS conventions contract (v2)

Content lives in three JSON files under \`src/data/\`: \`cms.json\` (manifest),
\`pages.json\` (all pages, keyed by page name), \`site.json\` (global). Markup is
made editable with the bridge components, or a \`data-cms-field\` attribute.

Two things must always be the **same string**:

1. the key path inside \`pages.json\` (page-relative) or \`site.json\` (bare)
2. the component \`field\` prop — or the \`data-cms-field\` attribute value

\`\`\`
pages.json:            { "home": { "hero": { "heading": "Welcome" } } }
src/pages/index.astro: <Heading1 field="hero.heading" value={home.hero.heading} />
\`\`\`

### Rules

- **Page fields** use section-prefixed dot paths (\`hero.heading\`); the page is
  implied by its route — NEVER prefix a path with the page name.
- **Global fields** (\`site.json\`) use bare paths (\`name\`, \`address.street\`).
- **List items append their index**: \`<Text field={\\\`items.\${i}.title\\\`} … />\`.
- **CTA** — \`{label, link}\` objects, use \`<Link field="hero.cta" value={cta} />\`.
- **Image** — \`<Image field="hero.image" value={img} alt={imageAlt} />\` (alt is a
  sibling key, untagged).
- **Repeated content** — wrap a mapped list in \`<Group field="…">\` with each
  item in \`<Item index={i}>\`.
- **Inline emphasis** in a text value: \`\\\`word\\\`\` → \`.cms-hl\`, \`**word**\` →
  \`.cms-mark\`. Both round-trip through canvas editing.
- **SEO** — every page has a top-level \`seo\` object \`{ title, description }\`.
- **\`site.json\` is mandatory.** Baseline keys: \`seo\`, \`name\`, \`tagline\`,
  \`logo\`, \`phone\`, \`email\`, \`address{street,city,region,zip,mapsUrl}\`,
  \`socials[]{label,url}\`, \`footer{text}\`.
- **\`src/data/seo.ts\` is NOT CMS content** — per-client identity config. Leave it.

### Idempotency rules (MUST respect)

- NEVER rename or renumber an existing \`data-cms-field\` path or JSON key — the
  CMS and saved drafts reference them.
- Only ADD. Existing values in the JSON always win over defaults.
- After every batch of changes, run \`npx cms-bridge check\` until clean.
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
  R11: {
    title: "Page entry renamed to avoid a collection clash",
    recipe: `A page's own JSON (e.g. \`src/data/blog.json\` behind the \`/blog\` index)
shared a name with a collection (\`src/data/blog/\`). Two entries can't share
one name, and merging the page's fields into the collection would leave the
page uneditable on the canvas — collections aren't route-mapped. init gave the
page its own file entry with a \`Page\` suffix (\`blog\` → \`blogPage\`) and
repointed its data import.

Nothing to do unless you want a different name: rename the file entry in
\`.pages.yml\`, its \`src/data/<name>.json\`, and the page's import to match.`,
  },
};

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

const ORDER: ReasonCode[] = ["R0", "R3", "R8", "R5", "R2", "R1", "R4", "R9", "R7", "R11", "R10", "R6"];

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
