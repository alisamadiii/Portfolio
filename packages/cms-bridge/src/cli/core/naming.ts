/**
 * Section prefix + field key derivation. Deterministic, adopt-first: names are
 * only computed for NEW fields; anything already in JSON or already tagged is
 * never renamed or renumbered.
 */

import type { AstroNode } from "./astro-doc.js";
import { staticAttr, walk } from "./astro-doc.js";
import { camelCase } from "./routes.js";
import type { FieldRole } from "../types.js";

// Tailwind-ish utility class tokens are never section names.
const UTILITY_CLASS =
  /^(?:-?(?:m|p)[trblxy]?-|flex|grid|block|inline|hidden|text-|bg-|font-|max-|min-|gap-|items-|justify-|content-|self-|place-|relative|absolute|fixed|sticky|static|w-|h-|size-|space-|divide-|border|rounded|shadow|ring|outline|opacity-|z-|order-|col-|row-|overflow-|object-|aspect-|leading-|tracking-|whitespace-|break-|truncate|uppercase|lowercase|capitalize|italic|underline|transition|duration-|ease-|delay-|animate-|cursor-|select-|pointer-|sr-only|group|peer|container|mx-auto)/;

const slugWords = (text: string, maxWords: number): string =>
  camelCase(
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/[\s-]+/)
      .slice(0, maxWords)
      .join("-")
  );

/** First h1-h3 static text inside a node. */
function firstHeadingText(section: AstroNode): string | undefined {
  let found: string | undefined;
  walk(section, (node) => {
    if (found) return false;
    if (
      node.type === "element" &&
      /^h[1-3]$/.test(node.name ?? "") &&
      node.children?.length
    ) {
      const text = node.children
        .filter((child) => child.type === "text")
        .map((child) => child.value ?? "")
        .join(" ")
        .trim();
      if (text) {
        found = text;
        return false;
      }
    }
  });
  return found;
}

/**
 * Derive a section's key. Priority: data-cms-section → id → first heading →
 * first non-utility class token → positional fallback. `used` guarantees
 * uniqueness within the page.
 */
export function sectionName(section: AstroNode, used: Set<string>): string {
  let base: string | undefined;

  const explicit = staticAttr(section, "data-cms-section");
  if (explicit) base = camelCase(explicit);

  // Adopted prefix: if the section already has tagged fields (hero.heading),
  // new fields join that prefix — matches the existing JSON structure.
  if (!base) {
    let adoptedPrefix: string | undefined;
    walk(section, (node) => {
      if (adoptedPrefix) return false;
      // Either raw markup (data-cms-field) or a bridge component (field prop).
      const field =
        staticAttr(node, "data-cms-field") ?? staticAttr(node, "field");
      const segment = field?.split(".")[0];
      if (segment && /^[a-zA-Z_]\w*$/.test(segment)) {
        adoptedPrefix = segment;
        return false;
      }
    });
    // Never adopt when unique-per-page numbering already claimed it elsewhere.
    if (adoptedPrefix && !used.has(adoptedPrefix)) base = adoptedPrefix;
  }

  if (!base) {
    const id = staticAttr(section, "id");
    if (id) base = camelCase(id);
  }

  if (!base) {
    const heading = firstHeadingText(section);
    if (heading) {
      const slug = slugWords(heading, 3);
      if (slug) base = slug;
    }
  }

  if (!base) {
    const classAttr = staticAttr(section, "class");
    const token = classAttr
      ?.split(/\s+/)
      .find(
        (candidate) =>
          candidate &&
          !candidate.includes(":") &&
          !candidate.includes("[") &&
          !UTILITY_CLASS.test(candidate)
      );
    if (token) base = camelCase(token);
  }

  if (!base) base = "section";

  let name = base;
  let counter = 2;
  while (used.has(name)) name = `${base}${counter++}`;
  used.add(name);
  return name;
}

export function roleForTag(tag: string): FieldRole | null {
  if (tag === "h1") return "heading";
  if (tag === "h2" || tag === "h3") return "title";
  if (/^h[4-6]$/.test(tag)) return "subtitle";
  if (tag === "p" || tag === "blockquote" || tag === "figcaption") return "text";
  if (tag === "a") return "cta";
  if (tag === "img") return "image";
  return null;
}
