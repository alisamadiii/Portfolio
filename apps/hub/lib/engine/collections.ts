/**
 * CMS v2 collections. A collection is declared in cms.json with a small
 * `fields` list; entries are Markdown files (frontmatter + body). This
 * builds the synthetic legacy-shaped schema that lets the existing
 * EntrySheet/EntryForm machinery edit v2 entries unchanged.
 */

import type { ManifestData } from "./v2";

import { buildBlogSchema, isBlogCollection } from "./blog-schema";
import { labelize } from "./infer";

export type ManifestCollection =
  ManifestData["object"]["collections"][number];

/**
 * A collection whose `path` points to a `.json` FILE (not a directory) is an
 * array collection: the file holds `[ {item}, … ]` and order IS array order.
 * Directory collections keep the per-file/route/markdown model. This one rule
 * is the whole contract — see docs/collections.md.
 */
export const isArrayCollection = (collection: ManifestCollection): boolean =>
  collection.path.endsWith(".json");

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
  // Blog is special: every client shares one fixed, future-proofed schema
  // (always Markdown), regardless of what its cms.json blog fields declare.
  if (isBlogCollection(collection)) return buildBlogSchema(collection);

  const declared = collection.fields.map((field) => ({
    name: field.name,
    label: field.label ?? labelize(field.name),
    type: FIELD_TYPES.has(field.type) ? field.type : "string",
    required: field.required,
    ...(field.type === "select" && field.options
      ? { options: { values: field.options } }
      : {}),
    ...(field.type === "image" && field.multiple
      ? { options: { multiple: field.multiple } }
      : {}),
  }));
  const primary =
    declared.find((field) => field.type === "string")?.name ??
    declared[0]?.name ??
    "title";
  // JSON collections store body as a plain field; Markdown collections put it
  // below the frontmatter. Either way it's edited as multiline text and
  // publishV2 serializes by file extension.
  const isJson = collection.format === "json";
  const extension = isJson ? "json" : "md";
  return {
    name: collection.name,
    label: collection.label ?? labelize(collection.name),
    type: "collection",
    path: collection.path,
    format: isJson ? "json" : "yaml-frontmatter",
    extension,
    filename: `{year}-{month}-{day}-{primary}.${extension}`,
    view: { primary },
    fields: [...declared, { name: "body", label: "Body", type: "text" }],
  };
}

/**
 * Synthetic schema for editing ONE item of an array collection. Same declared
 * fields as `collectionSchema`, but no appended `body` (arrays have no markdown
 * body) and no filename/primary-for-filename machinery — items live in a single
 * JSON file, identified by array position, never by a path. `view.primary` is
 * kept only to label the row in the table.
 */
export function arrayItemSchema(
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
    ...(field.type === "image" && field.multiple
      ? { options: { multiple: field.multiple } }
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
    format: "json",
    view: { primary },
    fields: declared,
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
