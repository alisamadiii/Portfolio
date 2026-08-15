/**
 * src/pages file → route + entry name derivation.
 *
 * Entry-name rule: if the page already imports a src/data JSON, that import's
 * name wins (adopt-first — guarantees no-op on wired projects). This module
 * only computes the fallback derivation from the file path.
 */

import path from "node:path";

export function routeForPage(relPagePath: string): string | null {
  // relPagePath is relative to src/pages, posix separators.
  const noExt = relPagePath.replace(/\.astro$/, "");
  // Dynamic routes ([slug]) are collection-backed — out of codemod scope.
  if (noExt.includes("[")) return null;
  if (noExt === "index") return "/";
  const trimmed = noExt.replace(/\/index$/, "");
  return `/${trimmed}`;
}

/** "our-story" → "ourStory" */
export function camelCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, ch: string) => ch.toUpperCase())
    .replace(/^[^a-zA-Z_]+/, "")
    .replace(/^([A-Z])/, (ch) => ch.toLowerCase());
}

/** Entry name from a page path: index → home, else camelCased slug. */
export function entryNameForPage(relPagePath: string): string {
  const base = path.posix.basename(relPagePath, ".astro");
  if (base === "index") {
    const dir = path.posix.dirname(relPagePath);
    if (dir === ".") return "home";
    return camelCase(path.posix.basename(dir));
  }
  return camelCase(base);
}
