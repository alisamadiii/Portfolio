/**
 * Classification rules engine: walks a page's AST and sorts every
 * content-bearing element into ADOPTED (already tagged), SAFE (auto
 * candidate), or REPORT (needs a human/AI decision).
 *
 * Component tags (Layout, wrappers) are transparent: their slot children are
 * page-owned markup that renders verbatim, so elements inside them are fair
 * game. Expressions are hard boundaries — nothing inside is auto-touched.
 */

import type {
  AstroNode,
  ParsedAstro,
} from "./astro-doc.js";
import {
  getAttr,
  isComponent,
  isExpression,
  quotedAttrSpan,
  soleStaticText,
  staticAttr,
  walk,
} from "./astro-doc.js";
import { roleForTag, sectionName } from "./naming.js";
import type {
  CandidateField,
  PageAnalysis,
  PageFile,
  ReportItem,
} from "../types.js";

const CHROME_ANCESTORS = new Set(["form", "nav", "header", "footer"]);
const CHROME_TAGS = new Set(["label", "button", "option", "legend", "summary"]);
const SKIP_TAGS = new Set(["script", "style", "slot", "title"]);

const line = (node: AstroNode): number => node.position?.start?.line ?? 0;

/**
 * The CMS field path an element/component already carries, if any: a
 * `data-cms-field` attribute (raw markup) or a bridge component's `field` prop
 * (`<Text field="hero.text" />`). Any attr kind counts — template-literal paths
 * (`{`items.${i}.name`}`) are adopted too.
 */
function adoptedFieldOf(node: AstroNode): string | undefined {
  const attr = getAttr(node, "data-cms-field") ?? getAttr(node, "field");
  return attr?.value;
}

const excerptAt = (source: string, lineNumber: number): string => {
  const text = source.split("\n")[lineNumber - 1] ?? "";
  const trimmed = text.trim();
  return trimmed.length > 110 ? `${trimmed.slice(0, 107)}…` : trimmed;
};

/** Reason for an expression subtree: .map → R3, conditional → R4, else R1. */
function expressionReason(expr: AstroNode): "R1" | "R3" | "R4" {
  const code = (expr.children ?? [])
    .filter((child) => child.type === "text")
    .map((child) => child.value ?? "")
    .join("");
  if (/\.map\s*\(/.test(code)) return "R3";
  if (/\?|&&/.test(code)) return "R4";
  return "R1";
}

/** Does an expression subtree contain any static text worth reporting? */
function expressionHasStaticContent(expr: AstroNode): boolean {
  let found = false;
  walk(expr, (node, ancestors) => {
    if (found) return false;
    if (node === expr) return;
    const parent = ancestors[ancestors.length - 1];
    if (
      node.type === "text" &&
      parent?.type === "element" &&
      (node.value ?? "").trim().length > 1
    ) {
      found = true;
      return false;
    }
  });
  return found;
}

/** Frontmatter consts holding content-shaped arrays (nav-style) → R8. */
function frontmatterReports(
  frontmatter: AstroNode | null,
  page: PageFile
): ReportItem[] {
  const code = frontmatter?.value ?? "";
  if (!code) return [];
  const reports: ReportItem[] = [];
  const constArray = /const\s+(\w+)\s*(?::[^=]*)?=\s*\[([\s\S]*?)\]/g;
  let match: RegExpExecArray | null;
  while ((match = constArray.exec(code)) !== null) {
    const [, name, body] = match;
    const stringCount = (body.match(/["'`][^"'`]{3,}["'`]/g) ?? []).length;
    if (stringCount >= 2) {
      const lineNumber =
        (code.slice(0, match.index).match(/\n/g)?.length ?? 0) +
        (frontmatter?.position?.start?.line ?? 1);
      reports.push({
        code: "R8",
        file: page.relPath,
        line: lineNumber,
        excerpt: `const ${name} = [...] (${stringCount} strings)`,
        note: `Content-shaped frontmatter array — move to the page JSON and map with indexed data-cms-field paths.`,
        suggestedKey: name,
      });
    }
  }
  return reports;
}

export function classifyPage(
  page: PageFile,
  parsed: ParsedAstro,
  source: string
): PageAnalysis {
  const candidates: CandidateField[] = [];
  const reports: ReportItem[] = frontmatterReports(parsed.frontmatter, page);
  const adoptedPaths: string[] = [];
  const sectionNames = new Map<AstroNode, string>();
  const usedSections = new Set<string>();
  const reportedExpressions = new Set<AstroNode>();

  const sectionChainFor = (ancestors: AstroNode[]): string[] => {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const ancestor = ancestors[i];
      const isLandmark =
        ancestor.type === "element" &&
        (ancestor.name === "section" ||
          (ancestor.name === "div" && ancestors[i - 1]?.name === "main"));
      if (!isLandmark) continue;
      let name = sectionNames.get(ancestor);
      if (!name) {
        name = sectionName(ancestor, usedSections);
        sectionNames.set(ancestor, name);
      }
      return [name];
    }
    return [];
  };

  const isChrome = (node: AstroNode, ancestors: AstroNode[]): boolean =>
    CHROME_TAGS.has(node.name ?? "") ||
    ancestors.some(
      (ancestor) =>
        ancestor.type === "element" && CHROME_ANCESTORS.has(ancestor.name ?? "")
    );

  walk(parsed.ast, (node, ancestors) => {
    if (node.type === "frontmatter") return false;
    if (node.type === "element" && SKIP_TAGS.has(node.name ?? "")) return false;

    // Expression boundary: record adopted paths inside, report static content,
    // never descend for candidates.
    if (isExpression(node)) {
      walk(node, (inner) => {
        const adopted = adoptedFieldOf(inner);
        if (adopted) adoptedPaths.push(adopted);
      });
      const hasAdopted = (() => {
        let found = false;
        walk(node, (inner) => {
          if (adoptedFieldOf(inner)) {
            found = true;
            return false;
          }
        });
        return found;
      })();
      if (
        !hasAdopted &&
        expressionHasStaticContent(node) &&
        !reportedExpressions.has(node)
      ) {
        reportedExpressions.add(node);
        const chain = sectionChainFor([...ancestors, node]);
        reports.push({
          code: expressionReason(node),
          file: page.relPath,
          line: line(node),
          excerpt: excerptAt(source, line(node)),
          suggestedKey: chain.length ? `${chain[0]}.items` : "items",
        });
      }
      return false;
    }

    // Bridge components (<Text>, <Heading1>, <Image>, <Link>, <Group>) carry a
    // `field` prop — adopt the path and never descend (their slot children are
    // their own concern). Plain wrapper components (Layout, section wrappers
    // with no `field`) stay transparent so page markup inside is still scanned.
    if (isComponent(node)) {
      const field = getAttr(node, "field");
      if (field) {
        adoptedPaths.push(field.value);
        return false;
      }
      return;
    }

    if (node.type !== "element") return;
    const tag = node.name ?? "";

    // Already tagged → adopted, leave alone.
    const adopted = staticAttr(node, "data-cms-field");
    if (adopted) {
      adoptedPaths.push(adopted);
      return;
    }

    if (getAttr(node, "set:html") || getAttr(node, "set:text")) return false;

    // aria-label / title attr chrome strings — informational.
    for (const attrName of ["aria-label"] as const) {
      const value = staticAttr(node, attrName);
      if (value && value.length > 2) {
        reports.push({
          code: "R6",
          file: page.relPath,
          line: line(node),
          excerpt: `${attrName}="${value}"`,
          note: "Accessibility string — usually fine to leave hardcoded.",
        });
      }
    }

    // Form/nav chrome: placeholders + labels/buttons.
    const chrome = isChrome(node, ancestors);
    const placeholder = staticAttr(node, "placeholder");
    if (placeholder) {
      reports.push({
        code: "R6",
        file: page.relPath,
        line: line(node),
        excerpt: `placeholder="${placeholder}"`,
        note: "Form placeholder — decide whether the client should edit it.",
      });
    }

    const role = roleForTag(tag);
    if (!role && !CHROME_TAGS.has(tag)) return;

    const chain = sectionChainFor(ancestors);

    if (chrome) {
      const text = soleStaticText(node);
      if (text && text.value.trim().length > 1) {
        reports.push({
          code: "R6",
          file: page.relPath,
          line: line(node),
          excerpt: excerptAt(source, line(node)),
          note: "Chrome string (nav/form/header/footer) — content or UI? Decide before extracting.",
          suggestedKey: chain.length ? chain[0] : undefined,
        });
      }
      return;
    }
    if (!role) return;

    if (role === "image") {
      const srcAttr = getAttr(node, "src");
      const src = staticAttr(node, "src");
      const alt = staticAttr(node, "alt");
      if (!src) {
        if (alt) {
          reports.push({
            code: "R7",
            file: page.relPath,
            line: line(node),
            excerpt: excerptAt(source, line(node)),
            note: "Static alt on a dynamic-src image.",
          });
        }
        return;
      }
      const srcSpan = srcAttr ? quotedAttrSpan(source, srcAttr) : undefined;
      const altNode = getAttr(node, "alt");
      const altSpan = altNode ? quotedAttrSpan(source, altNode) : undefined;
      if (!srcSpan || node.position?.start?.offset === undefined) return;
      candidates.push({
        role,
        tag,
        sectionChain: chain,
        src,
        alt,
        line: line(node),
        el: {
          start: node.position.start.offset,
          name: tag,
          srcAttr: srcSpan,
          altAttr: altSpan,
        },
      });
      return;
    }

    if (role === "cta") {
      const hrefAttr = getAttr(node, "href");
      const href = staticAttr(node, "href");
      const direct = soleStaticText(node);
      // <a><span>Label</span></a> shape
      const nonWs = (node.children ?? []).filter(
        (child) => !(child.type === "text" && (child.value ?? "").trim() === "")
      );
      const span =
        nonWs.length >= 1 && nonWs[0].type === "element" && nonWs[0].name === "span"
          ? nonWs[0]
          : undefined;
      const spanText = span ? soleStaticText(span) : undefined;
      const label = direct ?? spanText;
      if (!href || !label || !label.value.trim()) {
        if (label && label.value.trim().length > 1) {
          reports.push({
            code: "R1",
            file: page.relPath,
            line: line(node),
            excerpt: excerptAt(source, line(node)),
            note: "Link with static label but dynamic/absent href.",
            suggestedKey: chain.length ? `${chain[0]}.cta` : "cta",
          });
        }
        return;
      }
      const hrefSpan = hrefAttr ? quotedAttrSpan(source, hrefAttr) : undefined;
      if (!hrefSpan || node.position?.start?.offset === undefined) return;
      candidates.push({
        role,
        tag,
        sectionChain: chain,
        text: label.value.trim(),
        href,
        line: line(node),
        el: {
          start: node.position.start.offset,
          name: tag,
          textStart: label.start,
          textValue: label.value,
          labelInSpan: !!spanText,
          spanStart: span?.position?.start?.offset,
          spanName: span?.name,
          hrefAttr: hrefSpan,
        },
      });
      return;
    }

    // Text roles.
    const text = soleStaticText(node);
    if (!text) {
      const hasStaticText = (node.children ?? []).some(
        (child) => child.type === "text" && (child.value ?? "").trim().length > 1
      );
      const hasElements = (node.children ?? []).some(
        (child) => child.type === "element" || child.type === "component"
      );
      if (hasStaticText && hasElements) {
        reports.push({
          code: "R2",
          file: page.relPath,
          line: line(node),
          excerpt: excerptAt(source, line(node)),
          note: "Mixed static text + inline markup — split into separate fields or tag manually.",
          suggestedKey: chain.length ? chain[0] : undefined,
        });
      }
      return;
    }
    const value = text.value.trim();
    if (value.length < 2 || /^[\W_]+$/.test(value)) return;
    if (node.position?.start?.offset === undefined) return;
    candidates.push({
      role,
      tag,
      sectionChain: chain,
      text: value,
      line: line(node),
      el: {
        start: node.position.start.offset,
        name: tag,
        textStart: text.start,
        textValue: text.value,
      },
    });
  });

  // Eyebrow pass: short text candidate before the section's first heading.
  const bySection = new Map<string, CandidateField[]>();
  for (const candidate of candidates) {
    const key = candidate.sectionChain.join(".");
    const list = bySection.get(key) ?? [];
    list.push(candidate);
    bySection.set(key, list);
  }
  for (const list of bySection.values()) {
    const headingIndex = list.findIndex(
      (candidate) => candidate.role === "heading" || candidate.role === "title"
    );
    if (headingIndex <= 0) continue;
    for (let i = 0; i < headingIndex; i++) {
      const candidate = list[i];
      if (candidate.role === "text" && (candidate.text ?? "").length < 40) {
        candidate.role = "eyebrow";
      }
    }
  }

  return {
    page,
    adopted: page.hasPagesBinding || adoptedPaths.length > 0,
    adoptedPaths,
    candidates,
    reports,
  };
}
