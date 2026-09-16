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
  type:
    | "string"
    | "text"
    | "number"
    | "boolean"
    | "image"
    | "date"
    | "datetime"
    | "object";
  list?: boolean;
  fields?: InferredField[];
  options?: { type?: string };
};

/**
 * cms-bridge auto-mode field ID: `<role>_<4 base36>`, plus the image alt
 * sibling `<id>Alt`. Mirror of AUTO_ID_RE in cms-bridge `src/auto/ids.ts` —
 * the hub doesn't depend on that package, keep the two in sync by hand.
 */
const AUTO_ID =
  /^(heading|title|subtitle|text|eyebrow|cta|image)_[a-z0-9]{4}(Alt)?$/;
const AUTO_LABEL: Record<string, string> = {
  heading: "Heading",
  title: "Title",
  subtitle: "Subtitle",
  text: "Text",
  eyebrow: "Eyebrow",
  cta: "Link",
  image: "Image",
};

/** camelCase / kebab-case key → "Title Case" label. */
export const labelize = (key: string): string => {
  // Random auto IDs are meaningless to humans — label by their role prefix.
  const auto = AUTO_ID.exec(key);
  if (auto) return auto[2] ? `${AUTO_LABEL[auto[1]]} Alt Text` : AUTO_LABEL[auto[1]];
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const IMAGE_VALUE = /\.(png|jpe?g|webp|avif|gif|svg|ico)(\?.*)?$/i;
const IMAGE_KEY = /(image|img|src|icon|logo|avatar|banner|photo|thumbnail)$/i;
const URL_KEY = /(link|url|href)$/i;
// A datetime is a date + time (calendar + time picker); a date is date-only.
const DATETIME_VALUE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/;
/** Long-ish prose edits better as multiline text than a single-line string. */
const TEXT_LENGTH = 120;

const inferScalar = (key: string, value: string): InferredField => {
  const base = { name: key, label: labelize(key) };
  if (
    IMAGE_VALUE.test(value) ||
    // Key-name signal: a populated value must look like a path (avoids tagging
    // arbitrary prose whose key ends in an image word); an empty value carries
    // no counter-signal, so trust the key — new/blank entries get an image
    // picker instead of a text box.
    (IMAGE_KEY.test(key) && (value === "" || value.startsWith("/"))) ||
    // auto-ID image fields: the role prefix is the type signal (covers
    // extensionless / root-relative paths that IMAGE_VALUE misses).
    /^image_[a-z0-9]{4}$/.test(key)
  )
    return { ...base, type: "image" };
  if (DATETIME_VALUE.test(value)) return { ...base, type: "datetime" };
  if (DATE_VALUE.test(value)) return { ...base, type: "date" };
  if (URL_KEY.test(key) || /^https?:\/\//.test(value))
    return { ...base, type: "string", options: { type: "url" } };
  if (value.length > TEXT_LENGTH || value.includes("\n"))
    return { ...base, type: "text" };
  return { ...base, type: "string" };
};

/** Merge the shapes of every array item so sparse items still infer fully. */
export const mergeItems = (items: unknown[]): Record<string, unknown> => {
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
