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
  openTagEnd,
  quotedAttrSpan,
  soleStaticText,
  staticAttr,
  walk,
} from "./astro-doc.js";
import { roleForTag, sectionName } from "./naming.js";
import { pathFromFieldAttr } from "../../auto/ids.js";
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

/** Inline formatting tags capturable inside a text element. */
const INLINE_TAGS = new Set(["span", "strong", "b", "em", "i"]);

/**
 * Is a div/span acting as a TEXT LEAF — every meaningful child is text, a
 * string-literal expression, or flattenable inline markup, with real text
 * somewhere? Layout wrappers (block children) never qualify.
 */
function isTextLeaf(node: AstroNode): boolean {
  let hasText = false;
  for (const child of node.children ?? []) {
    if (child.type === "text") {
      if ((child.value ?? "").trim().length > 1) hasText = true;
      continue;
    }
    if (isExpression(child)) {
      const code = (child.children ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.value ?? "")
        .join("");
      if (!/^\s*(["'])([^"'\\]*)\1\s*$/.test(code)) return false;
      continue;
    }
    if (child.type === "element" && INLINE_TAGS.has(child.name ?? "")) {
      if (inlineFlatText(child) === null) return false;
      hasText = true;
      continue;
    }
    return false;
  }
  return hasText;
}

/**
 * Flatten an inline element's subtree to plain text — nested inline elements
 * (span in span in span) contribute their text; anything else fails.
 */
function inlineFlatText(node: AstroNode): string | null {
  let out = "";
  for (const child of node.children ?? []) {
    if (child.type === "text") {
      out += child.value ?? "";
      continue;
    }
    if (child.type === "element" && INLINE_TAGS.has(child.name ?? "")) {
      const inner = inlineFlatText(child);
      if (inner === null) return null;
      out += inner;
      continue;
    }
    return null;
  }
  return out;
}
/**
 * Offset of the MATCHING `</tag` for the element whose content starts at
 * `from` — depth-aware, so same-tag nesting (span in span) resolves to the
 * OUTER close, where a plain indexOf would grab the inner one.
 */
function matchingClose(source: string, from: number, tag: string): number {
  let depth = 0;
  let i = from;
  const open = `<${tag}`;
  const close = `</${tag}`;
  while (i < source.length) {
    const nextOpen = source.indexOf(open, i);
    const nextClose = source.indexOf(close, i);
    if (nextClose < 0) return -1;
    // an opening must be a real tag start (next char terminates the name)
    const isOpen =
      nextOpen >= 0 &&
      nextOpen < nextClose &&
      /[\s/>]/.test(source[nextOpen + open.length] ?? "");
    if (isOpen) {
      depth++;
      i = nextOpen + open.length;
      continue;
    }
    if (depth === 0) return nextClose;
    depth--;
    i = nextClose + close.length;
  }
  return -1;
}

/** Expression whose code is a single plain string literal ({" "} spacers). */
const STRING_LITERAL_EXPR = /^\s*(["'])([^"'\\]*)\1\s*$/;

/**
 * Capture a text element that mixes raw text with inline spans/strong as ONE
 * rich field: `span` → `accent`, strong/b → **mark**, per-occurrence source
 * classes preserved. Returns null when any child is something else (real
 * expressions, nested blocks, dynamic classes) — those stay reports.
 */
function captureInline(
  node: AstroNode,
  source: string
): NonNullable<CandidateField["mixed"]> | null {
  const tag = node.name ?? "";
  let richText = "";
  const hlClasses: string[] = [];
  const markClasses: string[] = [];
  let inlineCount = 0;
  for (const child of node.children ?? []) {
    if (child.type === "text") {
      richText += child.value ?? "";
      continue;
    }
    if (isExpression(child)) {
      const code = (child.children ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.value ?? "")
        .join("");
      const literal = STRING_LITERAL_EXPR.exec(code);
      if (!literal) return null;
      richText += literal[2];
      continue;
    }
    if (child.type === "element" && INLINE_TAGS.has(child.name ?? "")) {
      const classAttr = getAttr(child, "class");
      if (classAttr && classAttr.kind !== "quoted") return null; // dynamic class
      // Nested inline markup (span in span) flattens to its combined text —
      // the OUTER element's class carries the styling.
      const flat = inlineFlatText(child);
      if (flat === null) return null;
      const text = flat.replace(/\s+/g, " ").trim();
      if (!text) return null;
      if (child.name === "strong" || child.name === "b") {
        if (text.includes("*")) return null;
        richText += `**${text}**`;
        markClasses.push(classAttr?.value ?? "");
      } else {
        if (text.includes("`")) return null;
        richText += `\`${text}\``;
        hlClasses.push(classAttr?.value ?? "");
      }
      inlineCount++;
      continue;
    }
    return null;
  }
  if (inlineCount === 0) return null;
  const collapsed = richText.replace(/\s+/g, " ").trim();
  if (collapsed.length < 2) return null;
  if (node.position?.start?.offset === undefined) return null;
  const { end: innerStart } = openTagEnd(source, node.position.start.offset, tag);
  const innerEnd = matchingClose(source, innerStart, tag);
  if (innerEnd < innerStart) return null;
  return { richText: collapsed, hlClasses, markClasses, innerStart, innerEnd };
}

/**
 * Wrap-eligible bare text runs among an element's direct children — used when
 * the element itself can't be one field (text interleaved with links/blocks).
 * Each run becomes an injected <span data-cms-field> in the OUTPUT.
 */
function textRunsOf(
  node: AstroNode
): Array<{ start: number; raw: string; value: string; line: number }> {
  const runs: Array<{ start: number; raw: string; value: string; line: number }> = [];
  for (const child of node.children ?? []) {
    if (child.type !== "text") continue;
    const raw = child.value ?? "";
    const value = raw.replace(/\s+/g, " ").trim();
    const start = child.position?.start?.offset;
    if (start === undefined || value.length < 2 || /^[\W_]+$/.test(value)) continue;
    runs.push({ start, raw, value, line: child.position?.start?.line ?? 0 });
  }
  return runs;
}

/** Frontmatter consts holding content-shaped arrays (nav-style) → R8. */
function frontmatterReports(
  frontmatter: AstroNode | null,
  page: PageFile,
  wireChrome: boolean
): ReportItem[] {
  const code = frontmatter?.value ?? "";
  if (!code) return [];
  const reports: ReportItem[] = [];
  const constArray = /const\s+(\w+)\s*(?::[^=]*)?=\s*\[([\s\S]*?)\]/g;
  let match: RegExpExecArray | null;
  while ((match = constArray.exec(code)) !== null) {
    const [, name, body] = match;
    // Flat contract: a PURE-LITERAL array is auto-lifted into the pages JSON
    // by the build (frontmatter-arrays.ts) — no report needed.
    if (wireChrome) {
      try {
        const value = new Function(`"use strict"; return ([${body}]);`)();
        if (Array.isArray(value)) continue;
      } catch {
        // references code — still a report
      }
    }
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

export type ClassifyOptions = {
  /**
   * Flat contract: chrome (buttons, labels, nav/header/footer text) becomes
   * normal editable candidates instead of R6 reports. Placeholders stay
   * report-only. Off for legacy repos (zero behavior change).
   */
  wireChrome?: boolean;
};

export function classifyPage(
  page: PageFile,
  parsed: ParsedAstro,
  source: string,
  options: ClassifyOptions = {}
): PageAnalysis {
  const wireChrome = options.wireChrome ?? false;
  const candidates: CandidateField[] = [];
  const reports: ReportItem[] = frontmatterReports(
    parsed.frontmatter,
    page,
    wireChrome
  );
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
      // Slot text (flat contract): bare text passed as a component's child —
      // <Eyebrow>A field guide</Eyebrow>. The component's internals can't be
      // reached from here, so the OUTPUT wraps the text in an injected
      // <span data-cms-field>. Element children keep being scanned normally.
      if (wireChrome) {
        for (const child of node.children ?? []) {
          if (child.type !== "text") continue;
          const raw = child.value ?? "";
          const value = raw.replace(/\s+/g, " ").trim();
          if (value.length < 2 || /^[\W_]+$/.test(value)) continue;
          const start = child.position?.start?.offset;
          if (start === undefined) continue;
          candidates.push({
            role: "text",
            tag: node.name ?? "component",
            sectionChain: sectionChainFor(ancestors),
            slotWrap: true,
            text: value,
            line: line(child),
            el: { start, name: node.name ?? "component", textStart: start, textValue: raw },
          });
        }
      }
      return;
    }

    if (node.type !== "element") return;
    const tag = node.name ?? "";

    // Already tagged → self-pinned: the path is frozen (never renumbered) and
    // the element is still a candidate so substitution/sync/seeding apply.
    // A stamp is deliberate, so no reports are emitted for it.
    const adopted = staticAttr(node, "data-cms-field");
    if (adopted) adoptedPaths.push(adopted);

    if (getAttr(node, "set:html") || getAttr(node, "set:text")) return false;

    if (!adopted) {
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
    }

    // Form/nav chrome: placeholders + labels/buttons.
    const chrome = isChrome(node, ancestors);
    const placeholder = staticAttr(node, "placeholder");
    if (placeholder && !adopted) {
      reports.push({
        code: "R6",
        file: page.relPath,
        line: line(node),
        excerpt: `placeholder="${placeholder}"`,
        note: "Form placeholder — decide whether the client should edit it.",
      });
    }

    // Chrome tags (button/label/…) have no intrinsic role; when chrome is
    // wired (flat contract) they become plain text candidates.
    const LIST_TAGS = ["li", "dt", "dd"];
    // div/span with ONLY text/inline children are text leaves — the common
    // AI-markup pattern of copy living in wrappers. Layout wrappers (any
    // block child) never qualify and stay transparent.
    const leafWrapper =
      wireChrome && (tag === "div" || tag === "span") && isTextLeaf(node);
    const role =
      roleForTag(tag) ??
      (wireChrome && (CHROME_TAGS.has(tag) || LIST_TAGS.includes(tag) || leafWrapper)
        ? "text"
        : null);
    if (!role && !CHROME_TAGS.has(tag)) {
      // Non-role wrapper carrying stray bare text next to block children —
      // wrap each text run in an injected editable span. Children keep
      // being walked normally.
      if (wireChrome && !adopted) {
        for (const run of textRunsOf(node)) {
          candidates.push({
            role: "text",
            tag,
            sectionChain: sectionChainFor(ancestors),
            slotWrap: true,
            text: run.value,
            line: run.line,
            el: { start: run.start, name: tag, textStart: run.start, textValue: run.raw },
          });
        }
      }
      return;
    }
    // Stamped element whose tag has no role: adopted-only, nothing to extract.
    if (adopted && !role) return;

    const chain = sectionChainFor(ancestors);
    const selfPath = adopted && role ? pathFromFieldAttr(adopted, role) : undefined;

    if (chrome && !adopted && !wireChrome) {
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
        if (alt && !adopted) {
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
        path: selfPath,
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
      // Nested inline label (<a><span>x <span>y</span></span></a>): flatten
      // to plain text; substitution replaces the anchor's inner content.
      let flatLabel: string | undefined;
      if (wireChrome && !direct && !spanText && href) {
        const flat = inlineFlatText(node);
        const value = flat?.replace(/\s+/g, " ").trim();
        if (value && value.length >= 2) flatLabel = value;
      }
      const label = direct ?? spanText;
      if (flatLabel !== undefined && node.position?.start?.offset !== undefined) {
        const { end: innerStart } = openTagEnd(source, node.position.start.offset, tag);
        const innerEnd = matchingClose(source, innerStart, tag);
        const hrefSpanF = hrefAttr ? quotedAttrSpan(source, hrefAttr) : undefined;
        if (innerEnd >= innerStart && hrefSpanF) {
          candidates.push({
            role,
            tag,
            sectionChain: chain,
            path: selfPath,
            text: flatLabel,
            href,
            line: line(node),
            el: {
              start: node.position.start.offset,
              name: tag,
              innerStart,
              innerEnd,
              hrefAttr: hrefSpanF,
            },
          });
          return false;
        }
      }
      if (!href || !label || !label.value.trim()) {
        if (label && label.value.trim().length > 1 && !adopted) {
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
        path: selfPath,
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
      // Sole inline child with no surrounding text (<button><span>Label</span>)
      // — the span is structural, not an accent: wire the SPAN as a plain
      // text field so no marker noise leaks into the value.
      if (wireChrome) {
        const meaningful = (node.children ?? []).filter(
          (child) => !(child.type === "text" && (child.value ?? "").trim() === "")
        );
        const only = meaningful.length === 1 ? meaningful[0] : undefined;
        if (
          only &&
          only.type === "element" &&
          INLINE_TAGS.has(only.name ?? "") &&
          only.position?.start?.offset !== undefined
        ) {
          const innerText = soleStaticText(only);
          const innerValue = innerText?.value.replace(/\s+/g, " ").trim() ?? "";
          if (innerText && innerValue.length >= 2 && !/^[\W_]+$/.test(innerValue)) {
            candidates.push({
              role,
              tag: only.name ?? "span",
              sectionChain: chain,
              path: selfPath,
              text: innerValue,
              line: line(only),
              el: {
                start: only.position.start.offset,
                name: only.name ?? "span",
                textStart: innerText.start,
                textValue: innerText.value,
              },
            });
            return false;
          }
        }
      }

      // Inline-capture: text mixed with inline spans/strong → ONE rich field
      // (flat contract only). Falls through to the R2 report when uncapturable.
      if (wireChrome && node.position?.start?.offset !== undefined) {
        const mixed = captureInline(node, source);
        if (mixed) {
          candidates.push({
            role,
            tag,
            sectionChain: chain,
            path: selfPath,
            mixed,
            text: mixed.richText,
            line: line(node),
            el: { start: node.position.start.offset, name: tag },
          });
          return false; // children are captured — never descend
        }
      }
      // Text interleaved with non-inline children (links, nested blocks):
      // wrap each bare run as its own field; interior elements are walked
      // and wired on their own. Replaces the old R2 dead-end.
      if (wireChrome && !adopted) {
        const runs = textRunsOf(node);
        if (runs.length > 0) {
          for (const run of runs) {
            candidates.push({
              role: "text",
              tag,
              sectionChain: chain,
              slotWrap: true,
              text: run.value,
              line: run.line,
              el: { start: run.start, name: tag, textStart: run.start, textValue: run.raw },
            });
          }
          return; // children still walked
        }
      }
      const hasStaticText = (node.children ?? []).some(
        (child) => child.type === "text" && (child.value ?? "").trim().length > 1
      );
      const hasElements = (node.children ?? []).some(
        (child) => child.type === "element" || child.type === "component"
      );
      if (hasStaticText && hasElements && !adopted) {
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
      path: selfPath,
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
      // Stamped candidates keep their minted role — never re-roled.
      if (candidate.path) continue;
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
