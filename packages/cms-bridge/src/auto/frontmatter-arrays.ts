/**
 * Frontmatter array lift (flat contract): a pure-literal const array in a
 * page's frontmatter —
 *
 *   const stats = [{ value: "13.8B", label: "years since…" }, …]
 *
 * — is CONTENT, not code. The lift seeds the literal's REAL items into the
 * pages JSON under `<name>_<rand>` and rewrites the RHS in the OUTPUT to
 * `(pages["<name>_x"] ?? <original literal>)`, so the array becomes
 * hub-editable (values, add/remove/reorder) with zero source changes. The
 * original literal stays as the render fallback for the first build (stale
 * JSON import) — never a blank page.
 *
 * Only RHS that evaluate as a STANDALONE expression (no free identifiers)
 * and hold JSON-serializable content with at least one real string are
 * lifted; anything else is left alone (still reported by `check` as R8).
 */

import type { Splice } from "../cli/core/astro-doc.js";
import { randomSuffix, type IdRng } from "./ids.js";

export type LiftedArray = {
  /** The const's identifier in code. */
  name: string;
  /** The pages-JSON key (existing `<name>_<4>` array, or freshly minted). */
  key: string;
  /** Evaluated literal items — seeded verbatim when the key is fresh. */
  items: unknown[];
  /** True when the key was minted this run (seed the items). */
  fresh: boolean;
};

export type LiftResult = {
  lifted: LiftedArray[];
  /** Splices over the FULL source (frontmatter offsets already applied). */
  splices: Splice[];
  /** name → key for the loop wiring. */
  localArrays: Map<string, string>;
};

/** Find the matching `]` for the `[` at `open` (tracks strings + nesting). */
function closeBracket(code: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "[" || c === "{" || c === "(") depth++;
    if (c === "]" || c === "}" || c === ")") {
      depth--;
      if (depth === 0 && c === "]") return i;
    }
  }
  return -1;
}

const hasStringLeaf = (value: unknown): boolean => {
  if (typeof value === "string") return value.trim().length >= 2;
  if (Array.isArray(value)) return value.some(hasStringLeaf);
  if (value && typeof value === "object")
    return Object.values(value).some(hasStringLeaf);
  return false;
};

const jsonSafe = (value: unknown): boolean => {
  try {
    return JSON.stringify(value) === JSON.stringify(JSON.parse(JSON.stringify(value)));
  } catch {
    return false;
  }
};

export type ArrayScope = {
  /** Keys this file owns (may be reused). */
  own?: Set<string>;
  /** Keys other files own (NEVER reused — same const name elsewhere must
   *  get its own key, or editing one component edits both). */
  foreign?: Set<string>;
};

export function liftFrontmatterArrays(
  frontmatterCode: string,
  /** Char offset of the frontmatter value inside the full source. */
  frontmatterStart: number,
  pageJson: Record<string, unknown>,
  pagesIdent: string | null,
  rng: IdRng = randomSuffix,
  scope: ArrayScope = {}
): LiftResult {
  const lifted: LiftedArray[] = [];
  const splices: Splice[] = [];
  const localArrays = new Map<string, string>();

  const constRe = /const\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*\[/g;
  let match: RegExpExecArray | null;
  while ((match = constRe.exec(frontmatterCode)) !== null) {
    const name = match[1];
    const open = match.index + match[0].length - 1;
    const close = closeBracket(frontmatterCode, open);
    if (close < 0) continue;
    const rhs = frontmatterCode.slice(open, close + 1);

    let items: unknown;
    try {
      items = new Function(`"use strict"; return (${rhs});`)();
    } catch {
      continue; // references other frontmatter values — real code, skip
    }
    if (!Array.isArray(items) || items.length === 0) continue;
    if (!jsonSafe(items) || !hasStringLeaf(items)) continue;

    // Reuse an existing `<name>_<4>` array key — but only one this file is
    // allowed to claim: prefer a key it already owns, else an UNOWNED key.
    // Keys owned by other files are invisible (same-name isolation).
    const keyRe = new RegExp(`^${name.replace(/\$/g, "\\$")}_[a-z0-9]{4}$`);
    const matches = Object.keys(pageJson).filter(
      (key) => keyRe.test(key) && Array.isArray(pageJson[key])
    );
    const existing =
      matches.find((key) => scope.own?.has(key)) ??
      matches.find((key) => !scope.foreign?.has(key));
    let key = existing;
    if (!key) {
      // Mint with re-roll: never collide with any JSON key, another file's
      // claim, or a key lifted earlier in this same pass.
      do {
        key = `${name}_${rng()}`;
      } while (
        key in pageJson ||
        scope.foreign?.has(key) ||
        scope.own?.has(key) ||
        localArrays.has(name) === false && [...localArrays.values()].includes(key)
      );
    }

    const ident = pagesIdent ?? "__cmsPages";
    const ref = `${ident}["${key}"]`;
    splices.push({
      start: frontmatterStart + open,
      end: frontmatterStart + close + 1,
      // Array-checked fallback: a stale import or a hub-broken value must
      // never crash the page's .map — the original literal always renders.
      replacement: `(Array.isArray(${ref}) ? ${ref} : ${rhs})`,
    });
    lifted.push({ name, key, items, fresh: !existing });
    localArrays.set(name, key);
  }

  // The page may not import the pages JSON at all — inject it once.
  if (lifted.length > 0 && !pagesIdent) {
    splices.push({
      start: frontmatterStart,
      end: frontmatterStart,
      replacement: `\nimport __cmsPages from "_pages.json";`,
    });
  }

  return { lifted, splices, localArrays };
}

// ---------------------------------------------------------------------------
// Two-way literal sync for lifted arrays — same contract as scalar fields:
// the source const and the JSON array never disagree.
// ---------------------------------------------------------------------------

/** JS-style serializer: bare identifier keys, double-quoted strings, 2-space indent. */
export function serializeArrayLiteral(items: unknown[], indent: string): string {
  const pad = indent + "  ";
  const value = (v: unknown, depth: string): string => {
    if (Array.isArray(v)) {
      if (v.length === 0) return "[]";
      return `[\n${v.map((x) => depth + "  " + value(x, depth + "  ")).join(",\n")},\n${depth}]`;
    }
    if (v && typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>).map(([k, x]) => {
        const key = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
        return `${key}: ${value(x, depth)}`;
      });
      return `{ ${entries.join(", ")} }`;
    }
    return JSON.stringify(v);
  };
  if (items.length === 0) return "[]";
  return `[\n${items.map((item) => pad + value(item, pad)).join(",\n")},\n${indent}]`;
}

type ScannedArray = {
  name: string;
  key: string;
  items: unknown[];
  /** Absolute source offsets of the RHS `[ ... ]`. */
  start: number;
  end: number;
  indent: string;
};

/** Scan lifted-eligible arrays whose `<name>_<4>` key exists in the JSON. */
function scanLifted(
  source: string,
  pageJson: Record<string, unknown>,
  scope: ArrayScope = {}
): ScannedArray[] {
  const fmOpen = source.indexOf("---");
  if (fmOpen < 0) return [];
  const fmStart = fmOpen + 3;
  const fmEnd = source.indexOf("---", fmStart);
  if (fmEnd < 0) return [];
  const code = source.slice(fmStart, fmEnd);

  const out: ScannedArray[] = [];
  const constRe = /const\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*\[/g;
  let match: RegExpExecArray | null;
  while ((match = constRe.exec(code)) !== null) {
    const name = match[1];
    const open = match.index + match[0].length - 1;
    const close = closeBracket(code, open);
    if (close < 0) continue;
    let items: unknown;
    try {
      items = new Function(`"use strict"; return (${code.slice(open, close + 1)});`)();
    } catch {
      continue;
    }
    if (!Array.isArray(items) || !jsonSafe(items)) continue;
    const keyRe = new RegExp(`^${name.replace(/\$/g, "\\$")}_[a-z0-9]{4}$`);
    const candidates = Object.keys(pageJson).filter(
      (k) => keyRe.test(k) && Array.isArray(pageJson[k])
    );
    const key =
      candidates.find((k) => scope.own?.has(k)) ??
      candidates.find((k) => !scope.foreign?.has(k));
    if (!key) continue;
    const lineStart = code.lastIndexOf("\n", match.index) + 1;
    const indent = /^\s*/.exec(code.slice(lineStart, match.index))?.[0] ?? "";
    out.push({
      name,
      key,
      items,
      start: fmStart + open,
      end: fmStart + close + 1,
      indent,
    });
  }
  return out;
}

const deepEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** JSON → source: rewrite drifted array literals to match the JSON. */
export function syncArraysJsonToSource(
  source: string,
  pageJson: Record<string, unknown>,
  scope: ArrayScope = {}
): string | null {
  const scanned = scanLifted(source, pageJson, scope);
  const rewrites = scanned
    .filter((s) => !deepEqual(s.items, pageJson[s.key]))
    .sort((a, b) => b.start - a.start);
  if (rewrites.length === 0) return null;
  let out = source;
  for (const s of rewrites) {
    out =
      out.slice(0, s.start) +
      serializeArrayLiteral(pageJson[s.key] as unknown[], s.indent) +
      out.slice(s.end);
  }
  return out;
}

/** Source → JSON: literals the dev edited win (dev-watcher direction). */
export function syncArraysSourceToJson(
  source: string,
  pageJson: Record<string, unknown>,
  scope: ArrayScope = {}
): Array<{ path: string; value: unknown }> {
  return scanLifted(source, pageJson, scope)
    .filter((s) => !deepEqual(s.items, pageJson[s.key]))
    .map((s) => ({ path: s.key, value: s.items }));
}
