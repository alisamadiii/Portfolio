/**
 * Auto-mode page transform: plain HTML in, CMS-wired HTML out — entirely at
 * build time. The SOURCE stays clean plain HTML; `data-cms-*` attrs exist
 * only in the transformed (built/served) output.
 *
 * For every safe candidate element (per classifyPage):
 *  - BIND it to a pages-JSON key (see bind.ts: manual → legacy → value →
 *    ordinal → mint). The JSON is the persistent ID store — element literals
 *    equal their JSON values (two-way dev sync keeps them so), which is what
 *    makes binding reorder-safe with no source stamps;
 *  - inject `data-cms-field` / `data-cms-kind` attrs into the OUTPUT,
 *    matching the bridge component contract, so the CMS canvas arms these
 *    elements unchanged;
 *  - JSON WINS: when the key resolves in the page JSON, substitute that value
 *    into the rendered output (text node / src / alt / href);
 *  - otherwise keep the markup literal and record an ADDITION so the caller
 *    can seed it into the JSON (add-only).
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
import type { CandidateField, PageFile } from "../cli/types.js";
import { bindCandidatePaths } from "./bind.js";
import type { IdRng } from "./ids.js";
import { liftFrontmatterArrays } from "./frontmatter-arrays.js";
import { loopWiring } from "./loops.js";
import { variableMarkSplices } from "./variables.js";
import {
  attrInjectSplice,
  attrValueSplice,
  collapse,
  hasRichMarkers,
  richImportSplices,
  textReplaceSplice,
} from "./splice.js";
import { hasHtmlEntities } from "../rich.js";

export type AutoAddition = { path: string; value: unknown };

export type AutoTransformResult = {
  code: string;
  additions: AutoAddition[];
  /** Paths auto-assigned on this page (for check/reporting). */
  autoPaths: string[];
};

export type AutoTransformContext = {
  relPath: string;
  pageKey: string;
  /** The page's object from the pages JSON ({} when the page has no entry). */
  pageJson: Record<string, unknown>;
  /** Optional warning sink (defaults to console.warn). */
  warn?: (message: string) => void;
  /** Injectable ID suffix source (tests). */
  rng?: IdRng;
  /**
   * Flat contract (cms.version 2): pageJson IS the whole root object, chrome
   * is wired, variables get data-cms-variant marks, arrays use minted keys.
   */
  flat?: boolean;
  /** Keys owned by other files this build (flat) — never bound here. */
  externalClaims?: Set<string>;
  /** Keys this file bound earlier in the session (flat) — ordinal scope. */
  ownClaims?: Set<string>;
};

/** Expression-wrapped string literal — safe for quotes, braces, `<`, non-ASCII. */
const expr = (value: unknown): string => `{${JSON.stringify(String(value))}}`;

function textSubstitution(
  candidate: CandidateField,
  source: string,
  value: unknown,
  needRich: { flag: boolean }
): Splice | null {
  const el = candidate.el;
  if (el.textStart === undefined || el.textValue === undefined) return null;
  const current = collapse(el.textValue);
  const next = String(value);
  if (next === current) return null;
  // Rich markers (` / **) OR author-typed HTML entities (&copy;, &#169;, …)
  // must go through renderRich + set:html: a plain `{expr}` is HTML-escaped by
  // Astro, which would render `&copy;` as the literal text "&copy;". renderRich
  // preserves valid entities and matches what the browser bridge renders.
  if (hasRichMarkers(next) || hasHtmlEntities(next)) {
    needRich.flag = true;
    return textReplaceSplice(
      source,
      el.textStart,
      el.textValue,
      `<Fragment set:html={renderRich(${JSON.stringify(next)})} />`
    );
  }
  return textReplaceSplice(source, el.textStart, el.textValue, expr(next));
}

/**
 * Transform one page. Returns null when the page needs no changes or cannot
 * be transformed safely (parse errors, splice anchor mismatch) — in both
 * cases the caller should use the original source untouched.
 */
export async function autoTransformPage(
  source: string,
  context: AutoTransformContext
): Promise<AutoTransformResult | null> {
  const warn = context.warn ?? ((message: string) => console.warn(message));

  let parsed;
  try {
    parsed = await parseAstro(source);
  } catch (error) {
    warn(`[cms-bridge auto] ${context.relPath}: parse failed — skipped (${error instanceof Error ? error.message : error})`);
    return null;
  }
  if (parsed.diagnosticCount > 0) {
    warn(`[cms-bridge auto] ${context.relPath}: parse diagnostics — skipped`);
    return null;
  }

  const page: PageFile = {
    filePath: context.relPath,
    relPath: context.relPath,
    route: "/",
    pageKey: context.pageKey,
    contentIdent: "content",
    hasPagesBinding: false,
    source,
  };

  const analysis = classifyPage(page, parsed, source, {
    wireChrome: context.flat ?? false,
  });

  // Bind every candidate to a JSON key (manual → legacy → value → ordinal →
  // mint). No source writes — the JSON is the persistent ID store.
  bindCandidatePaths(analysis, context.pageJson, {
    mint: true,
    rng: context.rng,
    externalClaims: context.externalClaims,
    ownClaims: context.flat ? (context.ownClaims ?? new Set()) : undefined,
    legacy: !context.flat,
  });

  const splices: Splice[] = [];
  const additions: AutoAddition[] = [];
  const autoPaths: string[] = [];
  const needRich = { flag: false };

  try {
    for (const candidate of analysis.candidates) {
      const path = candidate.path;
      if (!path) continue;
      const el = candidate.el;
      autoPaths.push(path);
      // Manual source attrs are the one exception — don't double-inject.
      const hasSourceAttr = analysis.adoptedPaths.includes(
        candidate.role === "cta" ? `${path}.link` : path
      );

      // Inline-capture: ONE rich field for text mixed with inline spans.
      // ALWAYS substituted via renderRich (even when equal) so the rendered
      // spans carry cms-hl/cms-mark and canvas edits round-trip; each source
      // span's own classes ride along per occurrence.
      if (candidate.mixed) {
        const m = candidate.mixed;
        if (!hasSourceAttr) {
          let attrs = ` data-cms-field="${path}" data-cms-kind="text"`;
          if (m.hlClasses.some(Boolean))
            attrs += ` data-cms-hl-class="${m.hlClasses.join("||")}"`;
          if (m.markClasses.some(Boolean))
            attrs += ` data-cms-mark-class="${m.markClasses.join("||")}"`;
          splices.push(attrInjectSplice(source, el.start, el.name, attrs));
        }
        const value = getAtPath(context.pageJson, path);
        if (value === undefined) additions.push({ path, value: m.richText });
        const v = value !== undefined ? String(value) : m.richText;
        const opts: Record<string, unknown> = {};
        if (m.hlClasses.some(Boolean)) opts.hlClass = m.hlClasses;
        if (m.markClasses.some(Boolean)) opts.markClass = m.markClasses;
        splices.push({
          start: m.innerStart,
          end: m.innerEnd,
          replacement: `<Fragment set:html={renderRich(${JSON.stringify(v)}, ${JSON.stringify(opts)})} />`,
        });
        needRich.flag = true;
        continue;
      }

      // Slot text: wrap the component's bare text child in an injected span
      // so it becomes a normal editable field in the rendered output.
      if (candidate.slotWrap && el.textStart !== undefined && el.textValue !== undefined) {
        const value = getAtPath(context.pageJson, path);
        if (value === undefined) {
          additions.push({ path, value: collapse(candidate.text ?? "") });
        }
        const v = value !== undefined ? String(value) : collapse(candidate.text ?? "");
        let inner: string;
        if (hasRichMarkers(v) || hasHtmlEntities(v)) {
          needRich.flag = true;
          inner = `<Fragment set:html={renderRich(${JSON.stringify(v)})} />`;
        } else {
          inner = `{${JSON.stringify(v)}}`;
        }
        // Keep the text node's own leading/trailing whitespace OUTSIDE the
        // injected span. Without this, wrapping a bare run that sits beside a
        // sibling (`&copy; {year}`, `<span>{name}</span>`) swallows the space
        // that separated them, rendering "©2026" instead of "© 2026".
        const raw = el.textValue;
        const lead = raw.match(/^\s*/)?.[0] ?? "";
        const trail = raw.match(/\s*$/)?.[0] ?? "";
        splices.push(
          textReplaceSplice(
            source,
            el.textStart,
            el.textValue,
            `${lead}<span data-cms-field="${path}" data-cms-kind="text">${inner}</span>${trail}`
          )
        );
        continue;
      }

      if (candidate.role === "image") {
        if (!hasSourceAttr) {
          splices.push(
            attrInjectSplice(
              source,
              el.start,
              el.name,
              ` data-cms-field="${path}" data-cms-kind="media"`
            )
          );
        }
        const src = getAtPath(context.pageJson, path);
        const alt = getAtPath(context.pageJson, `${path}Alt`);
        if (src === undefined) {
          additions.push({ path, value: candidate.src });
          additions.push({ path: `${path}Alt`, value: candidate.alt ?? "" });
        } else {
          if (el.srcAttr && String(src) !== candidate.src) {
            splices.push(attrValueSplice(source, el.srcAttr, `src=${expr(src)}`));
          }
          if (el.altAttr && alt !== undefined && String(alt) !== (candidate.alt ?? "")) {
            splices.push(attrValueSplice(source, el.altAttr, `alt=${expr(alt)}`));
          }
        }
        continue;
      }

      if (candidate.role === "cta") {
        // Link contract: the attr carries the `.link` leaf (matches Link.astro).
        if (!hasSourceAttr) {
          splices.push(
            attrInjectSplice(
              source,
              el.start,
              el.name,
              ` data-cms-field="${path}.link" data-cms-kind="link"`
            )
          );
        }
        const value = getAtPath(context.pageJson, path);
        if (value === undefined) {
          additions.push({
            path,
            value: { label: collapse(candidate.text ?? ""), link: candidate.href },
          });
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          const { label, link } = value as { label?: unknown; link?: unknown };
          if (el.hrefAttr && link !== undefined && String(link) !== candidate.href) {
            splices.push(attrValueSplice(source, el.hrefAttr, `href=${expr(link)}`));
          }
          if (label !== undefined) {
            const sub = textSubstitution(candidate, source, label, needRich);
            if (sub) splices.push(sub);
            // Flattened nested-inline label: no single text node — replace
            // the anchor's whole inner content when the value diverges.
            if (
              !sub &&
              el.textStart === undefined &&
              el.innerStart !== undefined &&
              el.innerEnd !== undefined &&
              String(label) !== collapse(candidate.text ?? "")
            ) {
              const labelStr = String(label);
              const replacement =
                hasRichMarkers(labelStr) || hasHtmlEntities(labelStr)
                  ? (() => {
                      needRich.flag = true;
                      return `<Fragment set:html={renderRich(${JSON.stringify(labelStr)})} />`;
                    })()
                  : expr(label);
              splices.push({
                start: el.innerStart,
                end: el.innerEnd,
                replacement,
              });
            }
          }
        }
        continue;
      }

      // Text roles (heading / title / subtitle / text / eyebrow).
      if (!hasSourceAttr) {
        splices.push(
          attrInjectSplice(
            source,
            el.start,
            el.name,
            ` data-cms-field="${path}" data-cms-kind="text"`
          )
        );
      }
      const value = getAtPath(context.pageJson, path);
      if (value === undefined) {
        additions.push({ path, value: collapse(candidate.text ?? "") });
      } else {
        const sub = textSubstitution(candidate, source, value, needRich);
        if (sub) splices.push(sub);
      }
    }

    // Frontmatter array lift: pure-literal const arrays become hub-editable
    // JSON arrays — REAL items seeded, RHS rewritten in the OUTPUT.
    let localArrays: Map<string, string> | undefined;
    if (context.flat && parsed.frontmatter?.value) {
      const frontmatterStart = source.indexOf("---") + 3;
      const pagesIdent =
        parsed.frontmatter.value.match(
          /import\s+(\w+)\s+from\s+["'][^"']*_?pages\.json["']/
        )?.[1] ?? null;
      const lift = liftFrontmatterArrays(
        parsed.frontmatter.value,
        frontmatterStart,
        context.pageJson,
        pagesIdent,
        context.rng,
        { own: context.ownClaims, foreign: context.externalClaims }
      );
      for (const arr of lift.lifted) {
        if (arr.fresh) additions.push({ path: arr.key, value: arr.items });
        autoPaths.push(arr.key);
      }
      splices.push(...lift.splices);
      localArrays = lift.localArrays;
    }

    // Plain `.map()` loops over page-JSON arrays → Group/Item DOM contract,
    // wired into the OUTPUT only (index param injected in-memory too).
    const loops = loopWiring(parsed.ast, parsed.frontmatter?.value ?? "", source, {
      pageKey: context.pageKey,
      pageJson: context.pageJson,
      warn,
      flat: context.flat,
      rng: context.rng,
      localArrays,
    });
    splices.push(...loops.splices);
    additions.push(...loops.additions);
    autoPaths.push(...loops.arrayKeys);

    // Variable-bound elements (values from _site.json → variables): mark
    // green + click-through to hub Variables. Never editable, never seeded.
    if (context.flat) {
      splices.push(
        ...variableMarkSplices(parsed.ast, parsed.frontmatter?.value ?? "", source)
      );
    }

    if (needRich.flag) {
      splices.push(...(await richImportSplices(source, parsed)));
    }

    // Additions must survive even with zero splices (a hand-deleted JSON key
    // on a page whose literals all match still needs to re-seed).
    if (splices.length === 0 && additions.length === 0) return null;

    const code = splices.length ? applySplices(source, splices) : source;
    if (splices.length > 0 && !(await reparses(code))) {
      warn(`[cms-bridge auto] ${context.relPath}: transformed source no longer parses — skipped`);
      return null;
    }

    return { code, additions, autoPaths };
  } catch (error) {
    if (error instanceof SpliceError) {
      warn(`[cms-bridge auto] ${context.relPath}: ${error.message} — skipped`);
      return null;
    }
    throw error;
  }
}
