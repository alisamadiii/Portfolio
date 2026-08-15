/**
 * JSON shape → .pages.yml field definitions. Deterministic inference matching
 * the demo project's conventions: {label, link} → shared `link` component,
 * image-looking strings → image fields, long strings → text, arrays of
 * objects → collapsible lists.
 */

import type { FieldDef } from "../types.js";

/** "ctaPrimary" → "Cta primary" — cheap humanization for labels. */
export function humanize(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const URLISH_KEY = /(?:^|[A-Z_-])(url|link|href)$/i;

function isImageValue(key: string, value: string): boolean {
  if (IMAGE_EXT.test(value)) return true;
  if (/image|logo|photo|avatar|icon/i.test(key) && value.startsWith("/")) return true;
  return false;
}

function fieldForString(key: string, value: string): FieldDef {
  const base: FieldDef = { name: key, label: humanize(key) };
  if (isImageValue(key, value)) return { ...base, type: "image" };
  if (URLISH_KEY.test(key) || /^https?:\/\//.test(value)) {
    return { ...base, type: "string", options: { type: "url" } };
  }
  if (/^(email)$/i.test(key)) return { ...base, type: "string", options: { type: "email" } };
  if (/^(phone|tel)$/i.test(key)) return { ...base, type: "string", options: { type: "tel" } };
  if (value.length > 80 || value.includes("\n")) return { ...base, type: "text" };
  return { ...base, type: "string" };
}

const isLinkObject = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value).sort();
  return (
    keys.length === 2 &&
    keys[0] === "label" &&
    keys[1] === "link" &&
    typeof value.label === "string" &&
    typeof value.link === "string"
  );
};

/** Merge the shapes of every item so sparse list items still yield all fields. */
function mergedListShape(items: unknown[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const item of items) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      if (!(key in merged)) merged[key] = value;
    }
  }
  return merged;
}

export function fieldForValue(key: string, value: unknown): FieldDef | null {
  if (typeof value === "string") return fieldForString(key, value);
  if (typeof value === "number") return { name: key, label: humanize(key), type: "number" };
  if (typeof value === "boolean") return { name: key, label: humanize(key), type: "boolean" };

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((item) => typeof item === "string")) {
      return { name: key, label: humanize(key), type: "string", list: true };
    }
    const shape = mergedListShape(value);
    if (Object.keys(shape).length === 0) return null;
    const fields = fieldsForObject(shape);
    const primary =
      fields.find((field) =>
        ["title", "name", "label", "heading"].includes(field.name)
      )?.name ?? fields[0]?.name;
    return {
      name: key,
      label: humanize(key),
      type: "object",
      list: primary ? { collapsible: { summary: `{fields.${primary}}` } } : true,
      fields,
    };
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (isLinkObject(record)) {
      return { name: key, label: humanize(key), component: "link" };
    }
    const fields = fieldsForObject(record);
    if (fields.length === 0) return null;
    return { name: key, label: humanize(key), type: "object", fields };
  }

  return null;
}

export function fieldsForObject(content: Record<string, unknown>): FieldDef[] {
  const fields: FieldDef[] = [];
  for (const [key, value] of Object.entries(content)) {
    if (key === "seo") continue; // seo gets its fixed definition, prepended
    const field = fieldForValue(key, value);
    if (field) fields.push(field);
  }
  return fields;
}

export const SEO_FIELD: FieldDef = {
  name: "seo",
  label: "SEO",
  type: "object",
  fields: [
    {
      name: "title",
      label: "Title",
      type: "string",
      required: true,
      description: "Shown as the page title in Google results and the browser tab.",
    },
    {
      name: "description",
      label: "Description",
      type: "text",
      description: "Short summary shown under the title in Google results.",
    },
  ],
};

/** Entry field list for a page JSON: seo first, then inferred sections. */
export function entryFieldsFor(content: Record<string, unknown>): FieldDef[] {
  return [SEO_FIELD, ...fieldsForObject(content)];
}
