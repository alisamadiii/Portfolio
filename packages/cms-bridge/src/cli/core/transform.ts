/**
 * The codemod: turns classified candidates into source splices for one page.
 *
 * Every splice is anchored at a start offset and verified by slice-equality
 * before being applied; the transformed source must re-parse cleanly or the
 * whole file is reverted (R0). This module never writes files — it returns
 * the new source + the JSON values that were extracted.
 */

import { init as initLexer, parse as parseImports } from "es-module-lexer";

import type { AstroNode, ParsedAstro, Splice } from "./astro-doc.js";
import {
  applySplices,
  getAttr,
  isComponent,
  quotedAttrSpan,
  reparses,
  SpliceError,
  verifySlice,
  walk,
} from "./astro-doc.js";
import type { CandidateField, PageFile, ReportItem } from "../types.js";

export type JsonAddition = { path: string; value: unknown };

export type TransformResult =
  | {
      ok: true;
      newSource: string;
      additions: JsonAddition[];
      seoAdded: boolean;
      reports: ReportItem[];
    }
  | { ok: false; reason: string };

const collapse = (value: string): string => value.replace(/\s+/g, " ").trim();

/** `src/pages/a/b.astro` → `../../data/<entry>.json` */
export function dataImportPath(relPagePath: string, entryName: string): string {
  const depth = relPagePath.replace(/^src\/pages\//, "").split("/").length;
  return `${"../".repeat(depth)}data/${entryName}.json`;
}

/** Insert-point right after `<tagname`, verified. */
function attrInsertSplice(
  source: string,
  start: number,
  tag: string,
  insertion: string
): Splice {
  verifySlice(source, start, `<${tag}`);
  const at = start + 1 + tag.length;
  return { start: at, end: at, replacement: insertion };
}

function textReplaceSplice(
  source: string,
  start: number,
  rawValue: string,
  replacement: string
): Splice {
  verifySlice(source, start, rawValue);
  return { start, end: start + rawValue.length, replacement };
}

function attrValueSplice(
  source: string,
  span: { start: number; raw: string },
  replacement: string
): Splice {
  verifySlice(source, span.start, span.raw);
  return { start: span.start, end: span.start + span.raw.length, replacement };
}

// ---------------------------------------------------------------------------
// SEO wiring
// ---------------------------------------------------------------------------

type SeoPlan = {
  splices: Splice[];
  title: string;
  description: string;
};

function findLayout(ast: AstroNode): AstroNode | undefined {
  let found: AstroNode | undefined;
  walk(ast, (node) => {
    if (found) return false;
    if (isComponent(node) && /Layout/i.test(node.name ?? "")) {
      found = node;
      return false;
    }
  });
  return found;
}

function planSeo(
  source: string,
  parsed: ParsedAstro,
  entryIdent: string,
  candidates: CandidateField[],
  page: PageFile,
  reports: ReportItem[],
  seed?: { title?: string; description?: string }
): SeoPlan | null {
  const layout = findLayout(parsed.ast);
  if (!layout || layout.position?.start?.offset === undefined) return null;

  const titleAttr = getAttr(layout, "title");
  const descAttr = getAttr(layout, "description");

  const migratable = (attr: typeof titleAttr): boolean =>
    !attr || attr.kind === "quoted";
  const alreadyWired = (attr: typeof titleAttr): boolean =>
    !!attr && (attr.kind === "expression" || attr.kind === "template-literal");

  // Adopted: any dynamic prop means the page manages SEO itself.
  if (alreadyWired(titleAttr) || alreadyWired(descAttr)) return null;
  if (!migratable(titleAttr) || !migratable(descAttr)) {
    reports.push({
      code: "R9",
      file: page.relPath,
      line: layout.position.start.line ?? 0,
      excerpt: `<${layout.name}> SEO props not statically migratable`,
    });
    return null;
  }

  const heading = candidates.find((candidate) => candidate.role === "heading");
  const firstText = candidates.find((candidate) => candidate.role === "text");
  const fallbackTitle =
    page.entryName.charAt(0).toUpperCase() + page.entryName.slice(1);
  const title =
    titleAttr?.value ?? heading?.text ?? seed?.title ?? fallbackTitle;
  const rawDescription = firstText?.text ?? seed?.description ?? "";
  const description =
    descAttr?.value ??
    (rawDescription.length > 160
      ? rawDescription.slice(0, 160).replace(/\s+\S*$/, "")
      : rawDescription);

  const splices: Splice[] = [];
  try {
    const titleSpan = titleAttr ? quotedAttrSpan(source, titleAttr) : undefined;
    if (titleAttr && !titleSpan) return null;

    // Description first when both are inserted at the tag start — same-offset
    // inserts render in reverse push order, so `title` ends up first. When
    // title already exists, the missing description docks right after it.
    if (descAttr) {
      const span = quotedAttrSpan(source, descAttr);
      if (!span) return null;
      splices.push(
        attrValueSplice(source, span, `description={${entryIdent}.seo.description}`)
      );
    } else {
      const at = titleSpan
        ? titleSpan.start + titleSpan.raw.length
        : layout.position.start.offset + 1 + (layout.name ?? "").length;
      splices.push({
        start: at,
        end: at,
        replacement: ` description={${entryIdent}.seo.description}`,
      });
    }
    if (titleSpan) {
      splices.push(
        attrValueSplice(source, titleSpan, `title={${entryIdent}.seo.title}`)
      );
    } else {
      splices.push(
        attrInsertSplice(
          source,
          layout.position.start.offset,
          layout.name ?? "",
          ` title={${entryIdent}.seo.title}`
        )
      );
    }
  } catch (error) {
    if (error instanceof SpliceError) return null;
    throw error;
  }

  return { splices, title, description };
}

// ---------------------------------------------------------------------------
// Frontmatter import injection
// ---------------------------------------------------------------------------

async function importSplice(
  source: string,
  parsed: ParsedAstro,
  entryName: string,
  page: PageFile
): Promise<Splice> {
  const statement = `import ${entryName} from "${dataImportPath(page.relPath, entryName)}";`;

  const frontmatter = parsed.frontmatter;
  if (!frontmatter || frontmatter.value === undefined) {
    // No frontmatter — create one at the very top.
    return { start: 0, end: 0, replacement: `---\n${statement}\n---\n` };
  }

  const value = frontmatter.value;
  // Frontmatter value begins after the opening `---` line.
  const open = source.indexOf("---");
  if (open === -1) throw new SpliceError("frontmatter fence not found");
  const valueStart = open + 3;
  verifySlice(source, valueStart, value);

  await initLexer;
  let insertAt = 0;
  try {
    const [imports] = parseImports(value);
    for (const imported of imports) {
      if (imported.se > insertAt) insertAt = imported.se;
    }
  } catch {
    insertAt = 0;
  }
  if (insertAt > 0) {
    // Statement end may sit before a semicolon — consume it so the new import
    // starts on its own line.
    if (value[insertAt] === ";") insertAt += 1;
    const at = valueStart + insertAt;
    return { start: at, end: at, replacement: `\n${statement}` };
  }
  return { start: valueStart, end: valueStart, replacement: `\n${statement}` };
}

// ---------------------------------------------------------------------------
// Main transform
// ---------------------------------------------------------------------------

export async function transformPage(
  page: PageFile,
  parsed: ParsedAstro,
  candidates: CandidateField[],
  options: {
    wireSeo: boolean;
    /** Fallback SEO seeds from already-extracted JSON (hero.heading etc.). */
    seoSeed?: { title?: string; description?: string };
  }
): Promise<TransformResult> {
  const source = page.source;
  const entryIdent = page.entryName;
  const splices: Splice[] = [];
  const additions: JsonAddition[] = [];
  const reports: ReportItem[] = [];

  try {
    for (const candidate of candidates) {
      const fieldPath = candidate.path;
      if (!fieldPath) continue;
      const ref = `${entryIdent}.${fieldPath}`;
      const el = candidate.el;

      if (candidate.role === "image") {
        if (!el.srcAttr) continue;
        const altRef = `${entryIdent}.${fieldPath}Alt`;
        let attrInsertion = ` data-cms-field="${fieldPath}"`;
        if (!el.altAttr) attrInsertion += ` alt={${altRef}}`;
        splices.push(attrInsertSplice(source, el.start, el.name, attrInsertion));
        splices.push(attrValueSplice(source, el.srcAttr, `src={${ref}}`));
        if (el.altAttr) {
          splices.push(attrValueSplice(source, el.altAttr, `alt={${altRef}}`));
        }
        additions.push({ path: fieldPath, value: candidate.src });
        additions.push({ path: `${fieldPath}Alt`, value: candidate.alt ?? "" });
        continue;
      }

      if (candidate.role === "cta") {
        if (!el.hrefAttr || el.textStart === undefined || el.textValue === undefined)
          continue;
        splices.push(attrValueSplice(source, el.hrefAttr, `href={${ref}.link}`));
        if (el.labelInSpan && el.spanStart !== undefined && el.spanName) {
          splices.push(
            attrInsertSplice(
              source,
              el.spanStart,
              el.spanName,
              ` data-cms-field="${fieldPath}.label"`
            )
          );
          splices.push(
            textReplaceSplice(source, el.textStart, el.textValue, `{${ref}.label}`)
          );
        } else {
          splices.push(
            textReplaceSplice(
              source,
              el.textStart,
              el.textValue,
              `<span data-cms-field="${fieldPath}.label">{${ref}.label}</span>`
            )
          );
        }
        additions.push({
          path: fieldPath,
          value: { label: collapse(candidate.text ?? ""), link: candidate.href },
        });
        continue;
      }

      // Text roles.
      if (el.textStart === undefined || el.textValue === undefined) continue;
      splices.push(
        attrInsertSplice(source, el.start, el.name, ` data-cms-field="${fieldPath}"`)
      );
      splices.push(textReplaceSplice(source, el.textStart, el.textValue, `{${ref}}`));
      additions.push({ path: fieldPath, value: collapse(candidate.text ?? "") });
    }

    // SEO wiring.
    let seoAdded = false;
    if (options.wireSeo) {
      const seoPlan = planSeo(
        source,
        parsed,
        entryIdent,
        candidates,
        page,
        reports,
        options.seoSeed
      );
      if (seoPlan) {
        splices.push(...seoPlan.splices);
        additions.push({ path: "seo.title", value: seoPlan.title });
        additions.push({ path: "seo.description", value: seoPlan.description });
        seoAdded = true;
      }
    }

    if (splices.length === 0) {
      return { ok: true, newSource: source, additions: [], seoAdded: false, reports };
    }

    // Import (only when something was extracted and no import exists yet).
    if (!page.hasDataImport) {
      splices.push(await importSplice(source, parsed, entryIdent, page));
    }

    const newSource = applySplices(source, splices);
    if (!(await reparses(newSource))) {
      return { ok: false, reason: "transformed source no longer parses" };
    }
    return { ok: true, newSource, additions, seoAdded, reports };
  } catch (error) {
    if (error instanceof SpliceError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}
