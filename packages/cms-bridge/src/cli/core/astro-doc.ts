/**
 * Thin wrapper around @astrojs/compiler for codemod use.
 *
 * The compiler's `position.end` values are unreliable (void elements and
 * expressions report bogus ends), so every edit in this CLI is derived from
 * START offsets only and verified by slice-equality against the source before
 * splicing. A failed verification aborts the whole file (reason R0) — the CLI
 * must never emit a broken .astro file.
 */

import { parse } from "@astrojs/compiler";

export type AstroNode = {
  type: string;
  name?: string;
  value?: string;
  kind?: string;
  attributes?: AstroAttribute[];
  children?: AstroNode[];
  position?: { start?: { line: number; column: number; offset: number } };
};

export type AstroAttribute = {
  name: string;
  kind: string; // "quoted" | "expression" | "empty" | "shorthand" | "spread" | "template-literal"
  value: string;
  position?: { start?: { line: number; column: number; offset: number } };
};

export type ParsedAstro = {
  ast: AstroNode;
  frontmatter: AstroNode | null;
  diagnosticCount: number;
};

/**
 * The compiler reports UTF-8 BYTE offsets; JS strings index UTF-16 code
 * units. Any non-ASCII character (— · é emoji) skews every later offset, so
 * all positions are converted to char indices right after parsing.
 */
function byteToCharConverter(source: string): ((byte: number) => number) | null {
  // Fast path: pure ASCII → offsets already match.
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7f]/.test(source)) return null;
  const map: number[] = [];
  let byte = 0;
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    let bytes: number;
    if (code < 0x80) bytes = 1;
    else if (code < 0x800) bytes = 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: the pair is one 4-byte code point.
      map[byte] = i;
      for (let b = 1; b < 4; b++) map[byte + b] = i;
      byte += 4;
      i++; // skip low surrogate
      continue;
    } else bytes = 3;
    map[byte] = i;
    for (let b = 1; b < bytes; b++) map[byte + b] = i;
    byte += bytes;
  }
  map[byte] = source.length;
  return (value: number) => map[value] ?? value;
}

function convertPositions(node: AstroNode, convert: (byte: number) => number): void {
  if (node.position?.start) {
    node.position.start.offset = convert(node.position.start.offset);
  }
  for (const attr of node.attributes ?? []) {
    if (attr.position?.start) {
      attr.position.start.offset = convert(attr.position.start.offset);
    }
  }
  for (const child of node.children ?? []) convertPositions(child, convert);
}

export async function parseAstro(source: string): Promise<ParsedAstro> {
  const result = await parse(source, { position: true });
  const ast = result.ast as unknown as AstroNode;
  const convert = byteToCharConverter(source);
  if (convert) convertPositions(ast, convert);
  const frontmatter =
    ast.children?.find((child) => child.type === "frontmatter") ?? null;
  return {
    ast,
    frontmatter,
    diagnosticCount: (result.diagnostics ?? []).filter(
      // Severity 1 = error. Hints/warnings don't block a codemod.
      (d: { severity?: number }) => d.severity === 1
    ).length,
  };
}

/**
 * Depth-first walk with ancestor stack. Visitor may return `false` to skip a
 * node's children.
 */
export function walk(
  node: AstroNode,
  visitor: (node: AstroNode, ancestors: AstroNode[]) => boolean | void,
  ancestors: AstroNode[] = []
): void {
  const descend = visitor(node, ancestors);
  if (descend === false) return;
  const next = [...ancestors, node];
  for (const child of node.children ?? []) walk(child, visitor, next);
}

// ---------------------------------------------------------------------------
// Splices
// ---------------------------------------------------------------------------

export type Splice = { start: number; end: number; replacement: string };

export class SpliceError extends Error {}

/**
 * Verify that `source` contains `expected` at `start`. Every splice range in
 * this CLI is anchored this way before being applied.
 */
export function verifySlice(
  source: string,
  start: number,
  expected: string
): void {
  const actual = source.slice(start, start + expected.length);
  if (actual !== expected) {
    throw new SpliceError(
      `offset ${start}: expected ${JSON.stringify(expected.slice(0, 40))}, found ${JSON.stringify(actual.slice(0, 40))}`
    );
  }
}

/** Apply splices in descending offset order. Overlaps throw. */
export function applySplices(source: string, splices: Splice[]): string {
  const sorted = [...splices].sort((a, b) => b.start - a.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].end > sorted[i - 1].start) {
      throw new SpliceError(
        `overlapping splices at ${sorted[i].start} and ${sorted[i - 1].start}`
      );
    }
  }
  let out = source;
  for (const splice of sorted) {
    out = out.slice(0, splice.start) + splice.replacement + out.slice(splice.end);
  }
  return out;
}

/** True when the transformed source still parses without errors. */
export async function reparses(source: string): Promise<boolean> {
  try {
    const { diagnosticCount } = await parseAstro(source);
    return diagnosticCount === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Node helpers
// ---------------------------------------------------------------------------

export const isElement = (node: AstroNode): boolean =>
  node.type === "element" || node.type === "custom-element";

export const isComponent = (node: AstroNode): boolean =>
  node.type === "component";

export const isExpression = (node: AstroNode): boolean =>
  node.type === "expression";

export const getAttr = (
  node: AstroNode,
  name: string
): AstroAttribute | undefined =>
  node.attributes?.find((attr) => attr.name === name);

/** Static (quoted) attribute value, undefined for dynamic/absent. */
export const staticAttr = (node: AstroNode, name: string): string | undefined => {
  const attr = getAttr(node, name);
  return attr && attr.kind === "quoted" ? attr.value : undefined;
};

/**
 * The raw `name="value"` text span of a quoted attribute, anchored at the
 * attribute's start offset. Returns undefined when the attribute (or its
 * position) is missing, or when the raw text can't be re-derived exactly —
 * callers must treat that as "don't touch".
 */
export function quotedAttrSpan(
  source: string,
  attr: AstroAttribute
): { start: number; raw: string } | undefined {
  const start = attr.position?.start?.offset;
  if (start === undefined || attr.kind !== "quoted") return undefined;
  for (const quote of ['"', "'"]) {
    const raw = `${attr.name}=${quote}${attr.value}${quote}`;
    if (source.slice(start, start + raw.length) === raw) return { start, raw };
  }
  return undefined;
}

/**
 * Char offset just past an element's open-tag `>`, plus whether it self-closed
 * (`/>`). Scans from `start` (the `<`) tracking quote state and `{}` expression
 * depth, so `>` inside a string or an expression attr never ends the tag early.
 * Throws SpliceError if the open tag never closes.
 */
export function openTagEnd(
  source: string,
  start: number,
  tag: string
): { end: number; selfClosed: boolean } {
  verifySlice(source, start, `<${tag}`);
  let quote: string | null = null;
  let brace = 0;
  for (let i = start + 1 + tag.length; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === "{") {
      brace++;
      continue;
    }
    if (c === "}") {
      if (brace > 0) brace--;
      continue;
    }
    if (c === ">" && brace === 0) {
      let j = i - 1;
      while (j > start && /\s/.test(source[j])) j--;
      return { end: i + 1, selfClosed: source[j] === "/" };
    }
  }
  throw new SpliceError(`offset ${start}: <${tag}> open tag never closes`);
}

/** Char offset just past the next `>` at or after `from`. */
export function scanPastGt(source: string, from: number): number {
  for (let i = from; i < source.length; i++) {
    if (source[i] === ">") return i + 1;
  }
  throw new SpliceError(`offset ${from}: expected a closing '>'`);
}

/** Sole non-whitespace child text node of an element, if that's all there is. */
export function soleStaticText(
  node: AstroNode
): { value: string; start: number } | undefined {
  const children = (node.children ?? []).filter(
    (child) => !(child.type === "text" && (child.value ?? "").trim() === "")
  );
  if (children.length !== 1) return undefined;
  const only = children[0];
  if (only.type !== "text") return undefined;
  const start = only.position?.start?.offset;
  if (start === undefined || only.value === undefined) return undefined;
  return { value: only.value, start };
}
