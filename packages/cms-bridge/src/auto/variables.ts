/**
 * Build-time marking of VARIABLE-bound elements (values from `_site.json` →
 * `variables`). These are NOT inline-editable — clients edit them on the hub
 * Variables page — but the canvas must show them (green outline) and route a
 * click to Settings → Variables.
 *
 * Contract (identical to `<Region type="variant" variantName>`): inject
 * `data-cms-variant="<path>"` on the element, where `<path>` is the property
 * path WITHIN the variables object (`email`, `socials.facebook`). The client
 * runtime arms it green, excludes it from inline editing, and posts
 * `variant-open` on click; the hub flashes the matching Variables field.
 *
 * Detection (direct chains only): expressions — text-position or attr
 * values — referencing the `_site.json` default import's variables:
 *   `<siteIdent>.variables.<path>`
 *   `const variables = <siteIdent>.variables` → `variables.<path>`
 *   `const { variables } = <siteIdent>`       → `variables.<path>`
 * Indirect helpers (a `siteConfig` module) stay manual via `<Region>`.
 */

import type { AstroNode, Splice } from "../cli/core/astro-doc.js";
import {
  getAttr,
  guardedSingleRoot,
  isExpression,
  walk,
} from "../cli/core/astro-doc.js";
import { attrInjectSplice } from "./splice.js";

/** Accessor regexes for the current page, or null when it can't use variables. */
/** Bare destructured idents map to their own name as the variables path. */
const MATCHER_PATHS = new WeakMap<RegExp, string>();

export function variablesMatchers(
  frontmatterCode: string
): RegExp[] | null {
  const importMatch = frontmatterCode.match(
    /import\s+(\w+)\s+from\s+["'][^"']*_site\.json["']/
  );
  const siteIdent = importMatch?.[1];
  if (!siteIdent) return null;

  const matchers: RegExp[] = [
    new RegExp(`\\b${siteIdent}\\.variables\\.([\\w$][\\w$.]*)`),
  ];
  const bound = frontmatterCode.match(
    new RegExp(`const\\s+(\\w+)\\s*=\\s*${siteIdent}\\.variables\\b`)
  )?.[1];
  const destructured = new RegExp(
    `const\\s*\\{[^}]*\\bvariables\\b[^}]*\\}\\s*=\\s*${siteIdent}\\b`
  ).test(frontmatterCode)
    ? "variables"
    : undefined;
  const bindings = [bound, destructured].filter(Boolean) as string[];
  for (const name of bindings) {
    matchers.push(new RegExp(`\\b${name}\\.([\\w$][\\w$.]*)`));
  }
  // Scalars destructured OUT of the variables binding:
  //   const { name, email } = variables;  →  bare `email` IS variables.email.
  // Guarded against member accesses (`item.name`) via the lookbehind.
  for (const name of bindings) {
    const picked = frontmatterCode.match(
      new RegExp(`const\\s*\\{([^}]*)\\}\\s*=\\s*${name}\\b`)
    )?.[1];
    if (!picked) continue;
    for (const raw of picked.split(",")) {
      const ident = raw.split(":")[0].trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(ident)) continue;
      matchers.push(
        new RegExp(`(?<![.\\w$])${ident}\\b((?:\\.[\\w$]+)*)`, "")
      );
      // map bare ident → its own name as the variables path
      MATCHER_PATHS.set(matchers[matchers.length - 1], ident);
    }
  }
  return matchers;
}

const expressionCode = (expr: AstroNode): string =>
  (expr.children ?? [])
    .filter((child) => child.type === "text")
    .map((child) => child.value ?? "")
    .join("");

/** Metadata/invisible elements never carry canvas marks. */
const NON_MARKABLE = new Set([
  "html", "head", "meta", "link", "base", "title", "script", "style", "noscript",
]);

/**
 * Splices that mark every element rendering a variables value with
 * `data-cms-variant`. Deepest wrapping element wins; elements already
 * carrying a variant (manual <Region> output or hand-written attr) and
 * subtrees inside a <Region> component are left alone.
 */
export function variableMarkSplices(
  ast: AstroNode,
  frontmatterCode: string,
  source: string
): Splice[] {
  const matchers = variablesMatchers(frontmatterCode);
  if (!matchers) return [];

  const pathIn = (code: string): string | undefined => {
    for (const matcher of matchers) {
      const m = matcher.exec(code);
      if (!m) continue;
      const base = MATCHER_PATHS.get(matcher);
      // bare destructured ident: path = ident (+ any tail accessors)
      let found = base !== undefined ? `${base}${m[1] ?? ""}` : m[1];
      if (!found) continue;
      found = found.replace(/^\./, "").replace(/\.+$/, "");
      // accessor tails are not variable paths: `socials.map(…)` → `socials`
      let prev = "";
      while (prev !== found) {
        prev = found;
        found = found.replace(
          /\.(map|filter|slice|forEach|reduce|join|length|some|every|find|includes|indexOf)$/,
          ""
        );
      }
      if (found) return found;
    }
    return undefined;
  };

  const marked = new Map<AstroNode, string>();

  walk(ast, (node, ancestors) => {
    if (node.type === "frontmatter") return false;
    if (node.type === "component" && node.name === "Region") return false;

    // Attr expressions on an element (`href={\`mailto:${site.variables.email}\`}`).
    if (
      node.type === "element" &&
      !NON_MARKABLE.has(node.name ?? "") &&
      !getAttr(node, "data-cms-variant")
    ) {
      for (const attr of node.attributes ?? []) {
        if (attr.kind === "quoted") continue;
        const path = pathIn(attr.value ?? "");
        if (path && !marked.has(node)) marked.set(node, path);
      }
    }

    // Text-position expressions: mark the nearest element ancestor.
    if (isExpression(node)) {
      if (guardedSingleRoot(node)) return; // guard — descend into its subtree

      const path = pathIn(expressionCode(node));
      if (path) {
        const host = [...ancestors]
          .reverse()
          .find((ancestor) => ancestor.type === "element");
        if (
          host &&
          host.position?.start?.offset !== undefined &&
          host.name &&
          !NON_MARKABLE.has(host.name) &&
          !marked.has(host) &&
          !getAttr(host, "data-cms-variant")
        ) {
          marked.set(host, path);
        }
      }
      return false; // never wire inside expressions here
    }
  });

  const splices: Splice[] = [];
  for (const [node, path] of marked) {
    if (node.position?.start?.offset === undefined || !node.name) continue;
    splices.push(
      attrInjectSplice(
        source,
        node.position.start.offset,
        node.name,
        ` data-cms-variant="${path}"`
      )
    );
  }
  return splices;
}
