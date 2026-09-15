/**
 * Splice builders for the auto-mode annotator. Unlike the old init codemod
 * (which swapped elements for bridge components), auto mode edits IN PLACE:
 * it injects `data-cms-*` attributes into open tags, substitutes JSON values
 * into text nodes / attr values, and (rarely) injects a `renderRich` import.
 *
 * Every splice is anchored by slice-equality (`verifySlice`) before being
 * applied — a mismatch aborts the whole file, never emits broken output.
 */

import { init as initLexer, parse as parseImports } from "es-module-lexer";

import type { ParsedAstro, Splice } from "../cli/core/astro-doc.js";
import { openTagEnd, verifySlice } from "../cli/core/astro-doc.js";

export const collapse = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const RICH_MODULE = "@alisamadiillc/cms-bridge/rich";

/** Does a string use the inline rich markers (`accent`, **bold**)? */
export const hasRichMarkers = (value: string): boolean =>
  value.includes("`") || value.includes("**");

/**
 * Zero-width splice that inserts ` data-cms-…` attributes at the end of an
 * element's open tag — before the `>` and, for self-closing tags, before the
 * `/` (so `<img a="b" />` stays `<img a="b" data-x />`).
 */
export function attrInjectSplice(
  source: string,
  elStart: number,
  tag: string,
  attrText: string
): Splice {
  const { end } = openTagEnd(source, elStart, tag);
  // end is just past `>`; walk back over `>`, whitespace, and a `/`.
  let at = end - 1; // the `>`
  let j = at - 1;
  while (j > elStart && /\s/.test(source[j])) j--;
  if (source[j] === "/") {
    at = j;
    while (at > elStart && /\s/.test(source[at - 1])) at--;
  }
  return { start: at, end: at, replacement: attrText };
}

/** Replace a text node's raw value (anchored). */
export function textReplaceSplice(
  source: string,
  start: number,
  rawValue: string,
  replacement: string
): Splice {
  verifySlice(source, start, rawValue);
  return { start, end: start + rawValue.length, replacement };
}

/** Replace a quoted attribute's full `name="value"` raw span (anchored). */
export function attrValueSplice(
  source: string,
  span: { start: number; raw: string },
  replacement: string
): Splice {
  verifySlice(source, span.start, span.raw);
  return { start: span.start, end: span.start + span.raw.length, replacement };
}

/**
 * Splice(s) that inject `import { renderRich } from ".../rich";` into the
 * page frontmatter (creating a frontmatter block when absent). No-op when the
 * import already exists.
 */
export async function richImportSplices(
  source: string,
  parsed: ParsedAstro
): Promise<Splice[]> {
  if (source.includes(RICH_MODULE)) return [];
  const line = `import { renderRich } from "${RICH_MODULE}";`;

  const frontmatter = parsed.frontmatter;
  if (!frontmatter || frontmatter.value === undefined) {
    return [{ start: 0, end: 0, replacement: `---\n${line}\n---\n` }];
  }

  const value = frontmatter.value;
  const open = source.indexOf("---");
  const valueStart = open + 3;
  verifySlice(source, valueStart, value);

  await initLexer;
  let insertAt = 0;
  try {
    const [imports] = parseImports(value);
    for (const imported of imports) if (imported.se > insertAt) insertAt = imported.se;
  } catch {
    insertAt = 0;
  }
  if (insertAt > 0) {
    if (value[insertAt] === ";") insertAt += 1;
    const at = valueStart + insertAt;
    return [{ start: at, end: at, replacement: `\n${line}` }];
  }
  return [{ start: valueStart, end: valueStart, replacement: `\n${line}` }];
}
