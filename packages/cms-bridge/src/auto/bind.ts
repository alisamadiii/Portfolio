/**
 * Element ↔ key binding for auto mode — no attrs in the SOURCE, ever.
 * `data-cms-*` exists only in the built/served output; the pages JSON itself
 * is the persistent ID store. Binding is recomputed deterministically on
 * every transform:
 *
 *   1. manual  — a source `data-cms-field` (rare, hand-written) self-pins;
 *   2. legacy  — the old positional key resolves in the JSON → reuse it;
 *   3. value   — element literal equals an unclaimed auto-ID key's value
 *                (role-compatible prefix). Reorder-safe: content moves with
 *                the element, so the key follows it;
 *   4. ordinal — nth unmatched element of a role family ↔ nth unclaimed key
 *                of that family, in order. Covers literal edits (position
 *                unchanged, value diverged);
 *   5. mint    — a fresh random ID, seeded into the JSON (transform only).
 *
 * Known edge: reordering AND hub-editing several same-role elements between
 * builds can cross-bind them at step 4 — the next dev-sync round trip
 * converges values, so nothing is lost, but a value can briefly swap.
 */

import { getAtPath } from "../cli/core/json-store.js";
import { assignPaths } from "../cli/core/naming.js";
import type { CandidateField, FieldRole, PageAnalysis } from "../cli/types.js";
import { AUTO_ID_RE, mintFieldId, type IdRng } from "./ids.js";
import { collapse } from "./splice.js";

const TEXT_FAMILY = new Set(["heading", "title", "subtitle", "text", "eyebrow"]);

/** Role family used for value/ordinal matching. */
const familyOf = (role: string): string =>
  TEXT_FAMILY.has(role) ? "text" : role;

const rolePrefixOf = (key: string): string | null =>
  AUTO_ID_RE.exec(key)?.[1] ?? null;

function valueMatches(candidate: CandidateField, value: unknown): boolean {
  if (candidate.role === "image") {
    return typeof value === "string" && value === candidate.src;
  }
  if (candidate.role === "cta") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const { label, link } = value as { label?: unknown; link?: unknown };
    return (
      String(label ?? "") === collapse(candidate.text ?? "") &&
      String(link ?? "") === candidate.href
    );
  }
  return typeof value === "string" && value === collapse(candidate.text ?? "");
}

export type BindOptions = {
  /** Mint fresh IDs for candidates nothing else claimed (transform only). */
  mint?: boolean;
  rng?: IdRng;
  /**
   * Keys owned by OTHER files this build (flat contract) — never bound here,
   * so identical literals in two files always get separate keys.
   */
  externalClaims?: Set<string>;
  /**
   * Keys THIS file bound previously in the session (flat contract). The
   * ordinal fallback is restricted to these — a global flat keyspace would
   * otherwise let one file's edited element steal a key belonging to a file
   * that hasn't transformed yet. When set, ordinal never touches keys
   * outside it; when undefined (nested contract), ordinal is unrestricted
   * within the page object as before.
   */
  ownClaims?: Set<string>;
  /** Run the legacy positional-key pass (nested contract only). */
  legacy?: boolean;
};

/**
 * Assign `path` to every candidate it can bind (mutates). Candidates left
 * pathless (when `mint` is off) are simply not editable until the next
 * build seeds them.
 */
export function bindCandidatePaths(
  analysis: PageAnalysis,
  pageJson: Record<string, unknown>,
  options: BindOptions = {}
): void {
  const claimed = new Set<string>(
    analysis.candidates.filter((c) => c.path).map((c) => c.path as string)
  );
  for (const key of options.externalClaims ?? []) claimed.add(key);

  // 2. Legacy pass — old positional keys that resolve in the JSON.
  const pathless = analysis.candidates.filter((c) => !c.path);
  if (pathless.length > 0 && (options.legacy ?? true)) {
    assignPaths(pathless, new Set(analysis.adoptedPaths));
    for (const candidate of pathless) {
      const legacy = candidate.path as string;
      const resolves =
        getAtPath(pageJson, legacy) !== undefined ||
        (candidate.role === "image" &&
          getAtPath(pageJson, `${legacy}Alt`) !== undefined);
      if (resolves && !claimed.has(legacy)) {
        claimed.add(legacy);
      } else {
        candidate.path = undefined;
      }
    }
  }

  // Unclaimed auto-ID keys, in JSON insertion order (== seeding order).
  const autoKeys = Object.keys(pageJson).filter(
    (key) => AUTO_ID_RE.test(key) && !claimed.has(key)
  );

  // 3. Value pass.
  for (const candidate of analysis.candidates) {
    if (candidate.path) continue;
    const family = familyOf(candidate.role);
    const match = autoKeys.find((key) => {
      if (claimed.has(key)) return false;
      const prefix = rolePrefixOf(key);
      if (!prefix || familyOf(prefix) !== family) return false;
      return valueMatches(candidate, pageJson[key]);
    });
    if (match) {
      candidate.path = match;
      claimed.add(match);
    }
  }

  // 4. Ordinal pass — per family, remaining candidates ↔ remaining keys.
  const remainingByFamily = new Map<string, string[]>();
  for (const key of autoKeys) {
    if (claimed.has(key)) continue;
    if (options.ownClaims && !options.ownClaims.has(key)) continue;
    const family = familyOf(rolePrefixOf(key) as string);
    (remainingByFamily.get(family) ?? remainingByFamily.set(family, []).get(family)!).push(key);
  }
  for (const candidate of analysis.candidates) {
    if (candidate.path) continue;
    const queue = remainingByFamily.get(familyOf(candidate.role));
    const key = queue?.shift();
    if (key) {
      candidate.path = key;
      claimed.add(key);
    }
  }

  // 5. Mint pass.
  if (options.mint) {
    const taken = new Set<string>([
      ...analysis.adoptedPaths,
      ...claimed,
      ...Object.keys(pageJson),
    ]);
    for (const candidate of analysis.candidates) {
      if (candidate.path) continue;
      candidate.path = mintFieldId(candidate.role as FieldRole, taken, options.rng);
      claimed.add(candidate.path);
    }
  }
}
