/**
 * The codemod: replaces plain markup (h1-h6, p, blockquote, figcaption, img, a)
 * with the cms-bridge components (Heading1/2/3, Text, Image, Link), moving each
 * value into the page object of pages.json and wiring the component `value`
 * prop back to it. Never nests one field inside another.
 *
 * Every splice is anchored by slice-equality before being applied; the
 * transformed source must re-parse cleanly or the whole file is reverted (R0).
 * This module never writes files — it returns the new source + the JSON values
 * that were extracted (page-relative; the caller nests them under the page key).
 */

import path from "node:path";

import { init as initLexer, parse as parseImports } from "es-module-lexer";

import type { AstroNode, ParsedAstro, Splice } from "./astro-doc.js";
import {
  applySplices,
  getAttr,
  isComponent,
  openTagEnd,
  quotedAttrSpan,
  reparses,
  scanPastGt,
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
      usedComponents: Set<string>;
      reports: ReportItem[];
    }
  | { ok: false; reason: string };

const COMPONENTS_MODULE = "@alisamadiillc/cms-bridge/components";

const collapse = (value: string): string => value.replace(/\s+/g, " ").trim();

/** Relative specifier from any src file to src/data/pages.json. */
export function pagesImportPath(relFilePath: string): string {
  const dir = path.posix.dirname(relFilePath.split(path.sep).join("/"));
  const rel = path.posix.relative(dir, "src/data/pages.json");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** `home` → `pages.home`; `about-us` → `pages["about-us"]`. */
function pageAccess(pageKey: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(pageKey)
    ? `pages.${pageKey}`
    : `pages[${JSON.stringify(pageKey)}]`;
}

/** Component + `as` tag for a candidate's tag/role. */
function componentFor(candidate: CandidateField): { name: string; as?: string } {
  if (candidate.role === "image") return { name: "Image" };
  if (candidate.role === "cta") return { name: "Link" };
  if (candidate.tag === "h1") return { name: "Heading1" };
  if (candidate.tag === "h2") return { name: "Heading2" };
  if (candidate.tag === "h3") return { name: "Heading3" };
  return { name: "Text", as: candidate.tag };
}

/** Raw open-tag attribute text (` class="x" id="y"`), self-close slash removed. */
function attrRegion(
  source: string,
  start: number,
  tag: string,
  end: number,
  selfClosed: boolean
): string {
  let region = source.slice(start + 1 + tag.length, end - 1);
  if (selfClosed) region = region.replace(/\s*\/\s*$/, "");
  return region.replace(/\s+$/, "");
}

/** Remove a raw `name="value"` substring (and its leading whitespace) from attrs. */
function removeRaw(region: string, raw?: string): string {
  if (!raw) return region;
  const idx = region.indexOf(raw);
  if (idx < 0) return region;
  let s = idx;
  while (s > 0 && /\s/.test(region[s - 1])) s--;
  return region.slice(0, s) + region.slice(idx + raw.length);
}

/** Prefix a single space when the attr region has content and lacks one. */
function pad(region: string): string {
  const r = region.trim() ? region.replace(/\s+$/, "") : "";
  if (!r) return "";
  return r.startsWith(" ") ? r : ` ${r}`;
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

/** Find the `</tag` that closes an element, skipping look-alikes (`</article`). */
function findCloseTag(source: string, from: number, tag: string): number {
  let idx = from;
  for (;;) {
    idx = source.indexOf(`</${tag}`, idx);
    if (idx < 0) throw new SpliceError(`no </${tag}> close tag after ${from}`);
    const after = source[idx + 2 + tag.length];
    if (after === undefined || after === ">" || after === "/" || /\s/.test(after)) {
      return idx;
    }
    idx += 2 + tag.length;
  }
}

// ---------------------------------------------------------------------------
// SEO wiring (Layout title/description → content.seo.*)
// ---------------------------------------------------------------------------

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
  ident: string,
  candidates: CandidateField[],
  page: PageFile,
  reports: ReportItem[],
  seed?: { title?: string; description?: string }
): { splices: Splice[]; title: string; description: string } | null {
  const layout = findLayout(parsed.ast);
  if (!layout || layout.position?.start?.offset === undefined) return null;

  const titleAttr = getAttr(layout, "title");
  const descAttr = getAttr(layout, "description");
  const migratable = (attr: typeof titleAttr): boolean =>
    !attr || attr.kind === "quoted";
  const alreadyWired = (attr: typeof titleAttr): boolean =>
    !!attr && (attr.kind === "expression" || attr.kind === "template-literal");

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

  const heading = candidates.find((c) => c.role === "heading");
  const firstText = candidates.find((c) => c.role === "text");
  const fallbackTitle = page.pageKey.charAt(0).toUpperCase() + page.pageKey.slice(1);
  const title = collapse(titleAttr?.value ?? heading?.text ?? seed?.title ?? fallbackTitle);
  const rawDescription = collapse(firstText?.text ?? seed?.description ?? "");
  const description =
    descAttr?.value ??
    (rawDescription.length > 160
      ? rawDescription.slice(0, 160).replace(/\s+\S*$/, "")
      : rawDescription);

  const splices: Splice[] = [];
  try {
    const titleSpan = titleAttr ? quotedAttrSpan(source, titleAttr) : undefined;
    if (titleAttr && !titleSpan) return null;

    if (descAttr) {
      const span = quotedAttrSpan(source, descAttr);
      if (!span) return null;
      splices.push(
        attrValueSplice(source, span, `description={${ident}.seo.description}`)
      );
    } else {
      const at = titleSpan
        ? titleSpan.start + titleSpan.raw.length
        : layout.position.start.offset + 1 + (layout.name ?? "").length;
      splices.push({
        start: at,
        end: at,
        replacement: ` description={${ident}.seo.description}`,
      });
    }
    if (titleSpan) {
      splices.push(attrValueSplice(source, titleSpan, `title={${ident}.seo.title}`));
    } else {
      verifySlice(source, layout.position.start.offset, `<${layout.name}`);
      const at = layout.position.start.offset + 1 + (layout.name ?? "").length;
      splices.push({ start: at, end: at, replacement: ` title={${ident}.seo.title}` });
    }
  } catch (error) {
    if (error instanceof SpliceError) return null;
    throw error;
  }

  return { splices, title, description };
}

// ---------------------------------------------------------------------------
// Frontmatter injection
// ---------------------------------------------------------------------------

/** Existing `import { … } from ".../components"` — its brace span + names. */
function existingComponentsImport(
  source: string
): { insertAt: number; names: string[]; afterComma: boolean } | null {
  const match = source.match(
    /import\s*\{([^}]*)\}\s*from\s*["']@alisamadiillc\/cms-bridge\/components["']/
  );
  if (!match || match.index === undefined) return null;
  const names = match[1]
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  // Insert right after the last name (before trailing whitespace + `}`) so the
  // result reads `{ Text, Heading2 }`, not `{ Text , Heading2}`. When the list
  // already ends with a trailing comma (`{ Text, }`), don't add another.
  let insertAt = source.indexOf("}", match.index);
  while (insertAt > 0 && /\s/.test(source[insertAt - 1])) insertAt--;
  const afterComma = source[insertAt - 1] === ",";
  return { insertAt, names, afterComma };
}

async function injectFrontmatter(
  source: string,
  parsed: ParsedAstro,
  page: PageFile,
  ident: string,
  usedComponents: Set<string>
): Promise<Splice[]> {
  const splices: Splice[] = [];
  const lines: string[] = [];

  // Component import: merge into an existing one, else add a fresh line.
  if (usedComponents.size > 0) {
    const existing = existingComponentsImport(source);
    if (existing) {
      const missing = [...usedComponents]
        .filter((name) => !existing.names.includes(name))
        .sort();
      if (missing.length > 0) {
        splices.push({
          start: existing.insertAt,
          end: existing.insertAt,
          replacement: existing.afterComma
            ? ` ${missing.join(", ")}`
            : `, ${missing.join(", ")}`,
        });
      }
    } else {
      lines.push(
        `import { ${[...usedComponents].sort().join(", ")} } from "${COMPONENTS_MODULE}";`
      );
    }
  }

  // pages import + content binding (only when the page doesn't bind one yet).
  if (!page.hasPagesBinding) {
    lines.push(`import pages from "${pagesImportPath(page.relPath)}";`);
    lines.push(`const ${ident} = ${pageAccess(page.pageKey)};`);
  }

  if (lines.length === 0) return splices;
  const block = lines.join("\n");

  const frontmatter = parsed.frontmatter;
  if (!frontmatter || frontmatter.value === undefined) {
    splices.push({ start: 0, end: 0, replacement: `---\n${block}\n---\n` });
    return splices;
  }

  const value = frontmatter.value;
  const open = source.indexOf("---");
  if (open === -1) throw new SpliceError("frontmatter fence not found");
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
    splices.push({ start: at, end: at, replacement: `\n${block}` });
  } else {
    splices.push({ start: valueStart, end: valueStart, replacement: `\n${block}` });
  }
  return splices;
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
    seoSeed?: { title?: string; description?: string };
  }
): Promise<TransformResult> {
  const source = page.source;
  // Avoid a `content` collision when the page already declares one for its own
  // use (only relevant when we're about to introduce the binding ourselves).
  let ident = page.contentIdent;
  if (
    !page.hasPagesBinding &&
    new RegExp(`\\b(?:const|let|var|function)\\s+${ident}\\b`).test(
      parsed.frontmatter?.value ?? ""
    )
  ) {
    ident = "cmsContent";
  }

  const splices: Splice[] = [];
  const additions: JsonAddition[] = [];
  const reports: ReportItem[] = [];
  const usedComponents = new Set<string>();

  try {
    for (const candidate of candidates) {
      const fieldPath = candidate.path;
      if (!fieldPath) continue;
      const ref = `${ident}.${fieldPath}`;
      const el = candidate.el;
      const tag = el.name;

      if (candidate.role === "image") {
        if (!el.srcAttr) continue;
        const { end, selfClosed } = openTagEnd(source, el.start, tag);
        let region = attrRegion(source, el.start, tag, end, selfClosed);
        region = removeRaw(region, el.srcAttr.raw);
        region = removeRaw(region, el.altAttr?.raw);
        const altRef = `${ref}Alt`;
        splices.push({
          start: el.start,
          end,
          replacement: `<Image${pad(region)} field="${fieldPath}" value={${ref}} alt={${altRef}} />`,
        });
        usedComponents.add("Image");
        additions.push({ path: fieldPath, value: candidate.src });
        additions.push({ path: `${fieldPath}Alt`, value: candidate.alt ?? "" });
        continue;
      }

      if (candidate.role === "cta") {
        if (!el.hrefAttr || el.textStart === undefined || el.textValue === undefined)
          continue;
        const { end } = openTagEnd(source, el.start, tag);
        let region = attrRegion(source, el.start, tag, end, false);
        region = removeRaw(region, el.hrefAttr.raw);
        splices.push({
          start: el.start,
          end,
          replacement: `<Link${pad(region)} field="${fieldPath}" value={${ref}}>`,
        });
        splices.push(
          textReplaceSplice(source, el.textStart, el.textValue, `{${ref}.label}`)
        );
        const closeStart = findCloseTag(
          source,
          el.textStart + el.textValue.length,
          tag
        );
        splices.push({
          start: closeStart,
          end: scanPastGt(source, closeStart),
          replacement: "</Link>",
        });
        usedComponents.add("Link");
        additions.push({
          path: fieldPath,
          value: { label: collapse(candidate.text ?? ""), link: candidate.href },
        });
        continue;
      }

      // Text roles (heading / title / subtitle / text / eyebrow).
      if (el.textStart === undefined || el.textValue === undefined) continue;
      const { end, selfClosed } = openTagEnd(source, el.start, tag);
      const region = attrRegion(source, el.start, tag, end, selfClosed);
      const closeStart = el.textStart + el.textValue.length;
      verifySlice(source, closeStart, `</${tag}`);
      const closeEnd = scanPastGt(source, closeStart);
      const comp = componentFor(candidate);
      const asAttr = comp.as ? ` as="${comp.as}"` : "";
      splices.push({
        start: el.start,
        end: closeEnd,
        replacement: `<${comp.name}${asAttr}${pad(region)} field="${fieldPath}" value={${ref}} />`,
      });
      usedComponents.add(comp.name);
      additions.push({ path: fieldPath, value: collapse(candidate.text ?? "") });
    }

    // SEO wiring.
    let seoAdded = false;
    if (options.wireSeo) {
      const seoPlan = planSeo(
        source,
        parsed,
        ident,
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
      return {
        ok: true,
        newSource: source,
        additions: [],
        seoAdded: false,
        usedComponents,
        reports,
      };
    }

    splices.push(
      ...(await injectFrontmatter(source, parsed, page, ident, usedComponents))
    );

    const newSource = applySplices(source, splices);
    if (!(await reparses(newSource))) {
      return { ok: false, reason: "transformed source no longer parses" };
    }
    return { ok: true, newSource, additions, seoAdded, usedComponents, reports };
  } catch (error) {
    if (error instanceof SpliceError) {
      return { ok: false, reason: error.message };
    }
    throw error;
  }
}
