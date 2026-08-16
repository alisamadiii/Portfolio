/**
 * CMS v2 schema inference. A v2 repo has no `.pages.yml` — the editor derives
 * everything it needs from the JSON value shapes. This produces the same
 * field-schema shape (`{ name, label, type, list, fields }`) the legacy canvas
 * machinery already walks (resolveFieldEntry / classifyEditable / SeoDialog /
 * SiteConfigSheet), so v2 plugs in without touching that code.
 */

export type InferredField = {
  name: string;
  label: string;
  type: "string" | "text" | "number" | "boolean" | "image" | "object";
  list?: boolean;
  fields?: InferredField[];
  options?: { type?: string };
};

/** camelCase / kebab-case key → "Title Case" label. */
export const labelize = (key: string): string => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const IMAGE_VALUE = /\.(png|jpe?g|webp|avif|gif|svg|ico)(\?.*)?$/i;
const IMAGE_KEY = /(image|img|src|icon|logo|avatar|banner|photo|thumbnail)$/i;
const URL_KEY = /(link|url|href)$/i;
/** Long-ish prose edits better as multiline text than a single-line string. */
const TEXT_LENGTH = 120;

const inferScalar = (key: string, value: string): InferredField => {
  const base = { name: key, label: labelize(key) };
  if (IMAGE_VALUE.test(value) || (IMAGE_KEY.test(key) && value.startsWith("/")))
    return { ...base, type: "image" };
  if (URL_KEY.test(key) || /^https?:\/\//.test(value))
    return { ...base, type: "string", options: { type: "url" } };
  if (value.length > TEXT_LENGTH || value.includes("\n"))
    return { ...base, type: "text" };
  return { ...base, type: "string" };
};

/** Merge the shapes of every array item so sparse items still infer fully. */
const mergeItems = (items: unknown[]): Record<string, unknown> => {
  const merged: Record<string, unknown> = {};
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    for (const [key, value] of Object.entries(item)) {
      if (!(key in merged) || merged[key] == null) merged[key] = value;
    }
  }
  return merged;
};

export function inferFields(values: unknown): InferredField[] {
  if (!values || typeof values !== "object" || Array.isArray(values)) return [];
  const out: InferredField[] = [];
  for (const [key, value] of Object.entries(values)) {
    const base = { name: key, label: labelize(key) };
    if (value === null || value === undefined) {
      out.push({ ...base, type: "string" });
    } else if (typeof value === "string") {
      out.push(inferScalar(key, value));
    } else if (typeof value === "number") {
      out.push({ ...base, type: "number" });
    } else if (typeof value === "boolean") {
      out.push({ ...base, type: "boolean" });
    } else if (Array.isArray(value)) {
      if (value.every((item) => typeof item !== "object" || item === null)) {
        out.push({ ...base, type: "string", list: true });
      } else {
        out.push({
          ...base,
          type: "object",
          list: true,
          fields: inferFields(mergeItems(value)),
        });
      }
    } else {
      out.push({ ...base, type: "object", fields: inferFields(value) });
    }
  }
  return out;
}
