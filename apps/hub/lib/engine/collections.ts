/**
 * CMS v2 collections. A collection is declared in cms.json with a small
 * `fields` list; entries are Markdown files (frontmatter + body). This
 * builds the synthetic legacy-shaped schema that lets the existing
 * EntrySheet/EntryForm machinery edit v2 entries unchanged.
 */

import type { ManifestData } from "./v2";

import { labelize } from "./infer";

export type ManifestCollection =
  ManifestData["object"]["collections"][number];

const FIELD_TYPES = new Set([
  "string",
  "text",
  "image",
  "date",
  "boolean",
  "number",
  "select",
]);

export function collectionSchema(
  collection: ManifestCollection
): Record<string, any> {
  const declared = collection.fields.map((field) => ({
    name: field.name,
    label: field.label ?? labelize(field.name),
    type: FIELD_TYPES.has(field.type) ? field.type : "string",
    required: field.required,
    ...(field.type === "select" && field.options
      ? { options: { values: field.options } }
      : {}),
  }));
  const primary =
    declared.find((field) => field.type === "string")?.name ??
    declared[0]?.name ??
    "title";
  return {
    name: collection.name,
    label: collection.label ?? labelize(collection.name),
    type: "collection",
    path: collection.path,
    format: "yaml-frontmatter",
    extension: "md",
    filename: "{year}-{month}-{day}-{primary}.md",
    view: { primary },
    // Body is the markdown below the frontmatter — edited as plain text
    // (markdown), serialized server-side by publishV2.
    fields: [...declared, { name: "body", label: "Body", type: "text" }],
  };
}

/** "2026-08-16-my-first-post.md" → { title: "My first post", date: "2026-08-16" } */
export function entryMetaFromFilename(filename: string): {
  title: string;
  date: string | null;
} {
  const stem = filename.replace(/\.(md|mdx|json)$/i, "");
  const match = stem.match(/^(\d{4}-\d{2}-\d{2})-(.*)$/);
  const date = match ? match[1]! : null;
  const raw = match ? match[2]! : stem;
  const words = raw.replace(/[-_]+/g, " ").trim();
  return {
    title: words.charAt(0).toUpperCase() + words.slice(1),
    date,
  };
}
