/**
 * Two-way dev sync for auto mode: the .astro literal and the JSON value are
 * kept identical, so the source never shows stale copy.
 *
 *  - JSON changed (hub or hand edit) → rewrite the page literals to match
 *    (`syncJsonToSource`). Astro's own HMR then reloads the page naturally.
 *  - Page changed (dev edit) → overwrite the JSON values to match
 *    (`syncSourceToJson`) — the dev's edit deliberately wins.
 *
 * Convergence: both directions compare-before-write; equal values produce no
 * write, so each edit settles in exactly one round trip.
 *
 * Key stability: the source carries NO data-cms attrs — candidates are bound
 * to their JSON keys per run via bind.ts (legacy → value → ordinal). Sync
 * only touches bound candidates; a brand-new element is invisible to both
 * directions until the next transform seeds its key (one page load in dev).
 *
 * Values that can't be represented as a plain text literal (`{`, `<`, rich
 * markers) skip the source rewrite — the render-time substitution still
 * covers them, the source just keeps the seed literal for those.
 */

import type { Splice } from "../cli/core/astro-doc.js";
import {
  applySplices,
  parseAstro,
  reparses,
  SpliceError,
} from "../cli/core/astro-doc.js";
import { classifyPage } from "../cli/core/classify.js";
import { getAtPath } from "../cli/core/json-store.js";
import type { PageFile } from "../cli/types.js";
import { bindCandidatePaths } from "./bind.js";
import {
  attrValueSplice,
  collapse,
  hasRichMarkers,
  textReplaceSplice,
} from "./splice.js";

/** Safe to write as a literal text node / quoted attr value in .astro? */
const literalSafe = (value: string): boolean =>
  !/[{}<>"]/.test(value) && !hasRichMarkers(value);

const pageFileFor = (relPath: string, pageKey: string, source: string): PageFile => ({
  filePath: relPath,
  relPath,
  route: "/",
  pageKey,
  contentIdent: "content",
  hasPagesBinding: false,
  source,
});

export type SyncToSourceResult = {
  /** New source when anything changed, else null. */
  newSource: string | null;
};

export type SyncOptions = {
  /** Flat contract: chrome wired, no legacy pass. */
  flat?: boolean;
  /** Keys owned by other files this build (flat) — excluded from binding. */
  externalClaims?: Set<string>;
  /** Keys this file bound earlier in the session (flat) — ordinal scope. */
  ownClaims?: Set<string>;
};

/**
 * JSON → source: rewrite stamped candidates' literals to match the JSON.
 */
export async function syncJsonToSource(
  source: string,
  relPath: string,
  pageKey: string,
  pageJson: Record<string, unknown>,
  warn: (message: string) => void,
  options: SyncOptions = {}
): Promise<SyncToSourceResult> {
  let parsed;
  try {
    parsed = await parseAstro(source);
  } catch {
    return { newSource: null };
  }
  if (parsed.diagnosticCount > 0) return { newSource: null };

  const analysis = classifyPage(pageFileFor(relPath, pageKey, source), parsed, source, {
    wireChrome: options.flat ?? false,
  });
  if (analysis.candidates.length === 0) return { newSource: null };
  bindCandidatePaths(analysis, pageJson, {
    legacy: !options.flat,
    externalClaims: options.externalClaims,
    ownClaims: options.flat ? (options.ownClaims ?? new Set()) : undefined,
  });

  const splices: Splice[] = [];
  try {
    for (const candidate of analysis.candidates) {
      const path = candidate.path;
      if (!path) continue;
      const el = candidate.el;

      if (candidate.role === "image") {
        const src = getAtPath(pageJson, path);
        const alt = getAtPath(pageJson, `${path}Alt`);
        if (
          el.srcAttr &&
          typeof src === "string" &&
          src !== candidate.src &&
          literalSafe(src)
        ) {
          splices.push(attrValueSplice(source, el.srcAttr, `src="${src}"`));
        }
        if (
          el.altAttr &&
          typeof alt === "string" &&
          alt !== (candidate.alt ?? "") &&
          literalSafe(alt)
        ) {
          splices.push(attrValueSplice(source, el.altAttr, `alt="${alt}"`));
        }
        continue;
      }

      if (candidate.role === "cta") {
        const value = getAtPath(pageJson, path);
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const { label, link } = value as { label?: unknown; link?: unknown };
        if (
          el.hrefAttr &&
          typeof link === "string" &&
          link !== candidate.href &&
          literalSafe(link)
        ) {
          splices.push(attrValueSplice(source, el.hrefAttr, `href="${link}"`));
        }
        if (
          typeof label === "string" &&
          el.textStart !== undefined &&
          el.textValue !== undefined &&
          label !== collapse(el.textValue) &&
          literalSafe(label)
        ) {
          splices.push(textReplaceSplice(source, el.textStart, el.textValue, label));
        }
        continue;
      }

      const value = getAtPath(pageJson, path);
      if (
        typeof value === "string" &&
        el.textStart !== undefined &&
        el.textValue !== undefined &&
        value !== collapse(el.textValue) &&
        literalSafe(value)
      ) {
        splices.push(textReplaceSplice(source, el.textStart, el.textValue, value));
      }
    }

    if (splices.length === 0) return { newSource: null };
    const newSource = applySplices(source, splices);
    if (!(await reparses(newSource))) {
      warn(`[cms-bridge auto] ${relPath}: sync rewrite no longer parses — skipped`);
      return { newSource: null };
    }
    return { newSource };
  } catch (error) {
    if (error instanceof SpliceError) {
      warn(`[cms-bridge auto] ${relPath}: sync ${error.message} — skipped`);
      return { newSource: null };
    }
    throw error;
  }
}

export type SyncOverwrite = { path: string; value: unknown };

/**
 * Source → JSON: values whose markup literal differs from the JSON — the
 * dev's source edit wins, so these overwrite.
 */
export async function syncSourceToJson(
  source: string,
  relPath: string,
  pageKey: string,
  pageJson: Record<string, unknown>,
  options: SyncOptions = {}
): Promise<SyncOverwrite[]> {
  let parsed;
  try {
    parsed = await parseAstro(source);
  } catch {
    return [];
  }
  if (parsed.diagnosticCount > 0) return [];

  const analysis = classifyPage(pageFileFor(relPath, pageKey, source), parsed, source, {
    wireChrome: options.flat ?? false,
  });
  if (analysis.candidates.length === 0) return [];
  bindCandidatePaths(analysis, pageJson, {
    legacy: !options.flat,
    externalClaims: options.externalClaims,
    ownClaims: options.flat ? (options.ownClaims ?? new Set()) : undefined,
  });

  const overwrites: SyncOverwrite[] = [];
  for (const candidate of analysis.candidates) {
    const path = candidate.path;
    if (!path) continue;

    if (candidate.role === "image") {
      const src = getAtPath(pageJson, path);
      const alt = getAtPath(pageJson, `${path}Alt`);
      if (src !== undefined && String(src) !== candidate.src) {
        overwrites.push({ path, value: candidate.src });
      }
      if (alt !== undefined && String(alt) !== (candidate.alt ?? "")) {
        overwrites.push({ path: `${path}Alt`, value: candidate.alt ?? "" });
      }
      continue;
    }

    if (candidate.role === "cta") {
      const value = getAtPath(pageJson, path);
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const { label, link } = value as { label?: unknown; link?: unknown };
      const currentLabel = collapse(candidate.text ?? "");
      if (
        (link !== undefined && String(link) !== candidate.href) ||
        (label !== undefined && String(label) !== currentLabel)
      ) {
        overwrites.push({
          path,
          value: { label: currentLabel, link: candidate.href },
        });
      }
      continue;
    }

    const value = getAtPath(pageJson, path);
    const current = collapse(candidate.text ?? "");
    if (value !== undefined && String(value) !== current) {
      // Rich-marker JSON values render via substitution; the literal is a
      // plain seed and shouldn't clobber the richer value.
      if (typeof value === "string" && hasRichMarkers(value)) continue;
      overwrites.push({ path, value: current });
    }
  }
  return overwrites;
}
