/**
 * Form descriptors for the admin UI.
 *
 * Two sources of truth, mirroring how the hub edits the v2 contract:
 * - pages.json / variables.json / seo.json are schema-less → the field type is
 *   INFERRED from each value's shape (same heuristics as cms-bridge's
 *   data-cms-kind inference: {label,link} object → link pair, media-looking
 *   string → image, etc.).
 * - array collections declare an explicit `fields: CollectionField[]` in
 *   cms.json → those map 1:1 onto typed widgets.
 */

import type { CollectionField } from "../core/types";

export type FormField =
  | { kind: "text"; path: string; label: string; multiline: boolean }
  | { kind: "image"; path: string; label: string }
  | { kind: "boolean"; path: string; label: string }
  | { kind: "number"; path: string; label: string }
  | { kind: "date"; path: string; label: string }
  | { kind: "select"; path: string; label: string; options: string[] }
  | { kind: "link"; path: string; label: string }
  | { kind: "group"; path: string; label: string; fields: FormField[] }
  | {
      kind: "list";
      path: string;
      label: string;
      itemLabelKey: string | null;
      /** Explicit per-item fields (collections); inferred from the item when absent. */
      itemFields?: FormField[];
      /** Template for "+ Add item" (collections); inferred from the first item when absent. */
      blankItem?: unknown;
    };

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?.*)?$/i;
const IMAGE_KEY = /(image|logo|icon|favicon|avatar|photo|thumbnail)$/i;

/** "heroTitle" → "Hero Title", "imageAlt" → "Image Alt", "cta" → "Cta". */
export const humanize = (key: string): string => {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const isImageValue = (key: string, value: string): boolean =>
  IMAGE_EXTENSION.test(value) ||
  (IMAGE_KEY.test(key) && (value === "" || value.startsWith("/")));

const isLinkObject = (value: unknown): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value as object);
  return (
    keys.length > 0 &&
    keys.every((key) => key === "label" || key === "link" || key === "url")
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** The key used to label list items in the UI (first short string field). */
const pickItemLabelKey = (items: unknown[]): string | null => {
  const first = items.find(isPlainObject);
  if (!first) return null;
  for (const [key, value] of Object.entries(first)) {
    if (typeof value === "string" && value.length > 0 && value.length <= 120) {
      return key;
    }
  }
  return null;
};

/** Infer a form field from a schema-less JSON value. Returns null for shapes the UI can't edit. */
export const inferField = (
  key: string,
  value: unknown,
  path: string
): FormField | null => {
  const label = humanize(key);

  if (typeof value === "boolean") return { kind: "boolean", path, label };
  if (typeof value === "number") return { kind: "number", path, label };

  if (typeof value === "string") {
    if (isImageValue(key, value)) return { kind: "image", path, label };
    return {
      kind: "text",
      path,
      label,
      multiline: value.length > 80 || value.includes("\n"),
    };
  }

  if (Array.isArray(value)) {
    return { kind: "list", path, label, itemLabelKey: pickItemLabelKey(value) };
  }

  if (isPlainObject(value)) {
    if (isLinkObject(value)) return { kind: "link", path, label };
    const fields = inferFields(value, path);
    if (fields.length === 0) return null;
    return { kind: "group", path, label, fields };
  }

  return null;
};

/** Infer the full field list for a schema-less object (a page slice, variables.json, ...). */
export const inferFields = (
  object: Record<string, unknown>,
  basePath = ""
): FormField[] => {
  const fields: FormField[] = [];
  for (const [key, value] of Object.entries(object)) {
    const path = basePath ? `${basePath}.${key}` : key;
    const field = inferField(key, value, path);
    if (field) fields.push(field);
  }
  return fields;
};

/** Map an explicit collection field def (cms.json) onto a form field. */
export const collectionField = (def: CollectionField): FormField => {
  const label = def.label ?? humanize(def.name);
  const path = def.name;
  switch (def.type) {
    case "boolean":
      return { kind: "boolean", path, label };
    case "number":
      return { kind: "number", path, label };
    case "date":
      return { kind: "date", path, label };
    case "select":
      return { kind: "select", path, label, options: def.options ?? [] };
    case "image":
      return def.multiple
        ? { kind: "list", path, label, itemLabelKey: null }
        : { kind: "image", path, label };
    case "text":
      return { kind: "text", path, label, multiline: true };
    default:
      return { kind: "text", path, label, multiline: false };
  }
};

const FIELD_DEFAULTS: Record<string, unknown> = {
  string: "",
  text: "",
  select: "",
  image: "",
  file: "",
  date: "",
  boolean: false,
  number: 0,
};

/** A blank collection item from explicit field defs (mirrors cms-bridge's placeholderItem). */
export const placeholderFromFields = (
  fields: CollectionField[]
): Record<string, unknown> => {
  const item: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field?.name) continue;
    item[field.name] =
      field.type in FIELD_DEFAULTS ? FIELD_DEFAULTS[field.type] : "";
  }
  return item;
};

/** The whole synthetic form field for an array collection (root = the array). */
export const collectionListField = (def: {
  name: string;
  label?: string;
  fields: CollectionField[];
}): FormField => ({
  kind: "list",
  path: "",
  label: def.label ?? humanize(def.name),
  itemLabelKey:
    def.fields.find(
      (field) => field.type === "string" || field.type === "text"
    )?.name ?? null,
  itemFields: def.fields.map(collectionField),
  blankItem: placeholderFromFields(def.fields),
});

/** Dot-path read. */
export const getAtPath = (object: unknown, path: string): unknown => {
  if (!path) return object;
  let current: unknown = object;
  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

/** Dot-path write returning a structurally-shared copy (state-friendly). */
export const setAtPath = <T>(object: T, path: string, value: unknown): T => {
  if (!path) return value as T;
  const segments = path.split(".");
  const root: any = Array.isArray(object)
    ? [...(object as unknown[])]
    : { ...(object as object) };
  let cursor = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const next = cursor[segment];
    cursor[segment] = Array.isArray(next) ? [...next] : { ...(next ?? {}) };
    cursor = cursor[segment];
  }
  cursor[segments[segments.length - 1]!] = value;
  return root as T;
};
