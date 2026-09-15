/**
 * Loop auto-wiring: plain `.map()` over a page-JSON array → the exact DOM
 * contract the <Group>/<Item> bridge components produce, injected as source
 * stamps (written to disk once, like element IDs):
 *
 *   host wrapper   data-cms-field="<arrayKey>" data-cms-kind="group"
 *   item root      data-cms-item={<i>}
 *   member         data-cms-field={`<arrayKey>.${<i>}.<member>`} + kind
 *
 * The canvas runtime (groupItems/reindexGroup/add-remove-move) consumes that
 * contract unchanged. Members are edited through the group dialog (the hub
 * builds the form from the JSON item shape), so partially-wired members are
 * safe — the attrs only drive canvas highlighting.
 *
 * Scope guards — anything else is left alone and reported by `check` as
 * today: single-root parenthesized arrow bodies only, array must live on the
 * page's JSON object (computed locals and nested item loops are skipped), no
 * adopted `data-cms-field` anywhere inside the expression.
 */

import type { AstroNode, Splice } from "../cli/core/astro-doc.js";
import {
  getAttr,
  isExpression,
  verifySlice,
  walk,
} from "../cli/core/astro-doc.js";
import { getAtPath } from "../cli/core/json-store.js";
import { randomSuffix, type IdRng } from "./ids.js";
import { attrInjectSplice } from "./splice.js";
import type { AutoAddition } from "./transform.js";

export type LoopWiringResult = {
  splices: Splice[];
  additions: AutoAddition[];
  /** Array keys wired on this page (for check/reporting). */
  arrayKeys: string[];
};

/**
 * `<head>[.slice(a[, b])].map((item[, i]) => (` — captured from the map
 * header text node. A `.slice` window still gets member wiring with ABSOLUTE
 * indices (i + a); group add/remove is disabled for sliced maps (reindexing
 * across split groups would corrupt the array).
 */
const MAP_HEADER_RE =
  /^\s*([\w$][\w$.]*?)(?:\.slice\(\s*(\d+)\s*(?:,\s*\d+\s*)?\))?\.map\s*\(\s*(\(?)\s*([\w$]+)\s*(?:,\s*([\w$]+))?\s*(\)?)\s*=>\s*\(?\s*$/;

const expressionCode = (expr: AstroNode): string =>
  (expr.children ?? [])
    .filter((child) => child.type === "text")
    .map((child) => child.value ?? "")
    .join("");

/** Any data-cms-field / bridge `field` prop anywhere inside a subtree? */
function subtreeAdopted(node: AstroNode): boolean {
  let found = false;
  walk(node, (inner) => {
    if (getAttr(inner, "data-cms-field") ?? getAttr(inner, "field")) {
      found = true;
      return false;
    }
  });
  return found;
}

/**
 * Resolve the map head (`home.features`, `pages.home.features`, bare
 * `features` from a destructure) to a page-relative array key, or null when
 * the head is not a page-JSON array reference.
 */
export function pageArrayKey(
  head: string,
  frontmatterCode: string,
  pageKey: string
): string | null {
  // The default-import ident of the pages JSON (`import pages from "_pages.json"`).
  const importMatch = frontmatterCode.match(
    /import\s+(\w+)\s+from\s+["'][^"']*_?pages\.json["']/
  );
  const pagesIdent = importMatch?.[1];
  const segments = head.split(".");

  // pages.<pageKey>.<arr...>
  if (
    pagesIdent &&
    segments.length >= 3 &&
    segments[0] === pagesIdent &&
    segments[1] === pageKey
  ) {
    return segments.slice(2).join(".");
  }

  if (pagesIdent) {
    // const <binding> = pages.<pageKey>  →  <binding>.<arr...>
    const bindingRe = new RegExp(
      `const\\s+(\\w+)\\s*=\\s*${pagesIdent}\\.${pageKey}\\b`
    );
    const binding = frontmatterCode.match(bindingRe)?.[1];
    if (binding && segments.length >= 2 && segments[0] === binding) {
      return segments.slice(1).join(".");
    }
    // const { a, b } = pages.<pageKey>  →  bare <arr...>
    const destructureRe = new RegExp(
      `const\\s*\\{([^}]*)\\}\\s*=\\s*${pagesIdent}\\.${pageKey}\\b`
    );
    const destructured = frontmatterCode.match(destructureRe)?.[1];
    if (destructured) {
      const names = destructured
        .split(",")
        .map((name) => name.split(":")[0].trim())
        .filter(Boolean);
      if (names.includes(segments[0])) return segments.join(".");
    }
  }
  return null;
}

const titleCase = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

export type LoopWiringContext = {
  pageKey: string;
  pageJson: Record<string, unknown>;
  warn: (message: string) => void;
  /**
   * Flat contract: array keys are `<devName>_<rand>` (unique + random); the
   * dev-written accessor is rewritten to the real key in the OUTPUT only.
   */
  flat?: boolean;
  rng?: IdRng;
  /**
   * Frontmatter-lifted const arrays: local name → pages-JSON key. Their RHS
   * is already rewritten by the lift, so maps over them wire the group
   * contract directly with no accessor rewrite and no bootstrap.
   */
  localArrays?: Map<string, string>;
};

/**
 * Flat-mode head resolution: the dev-written array NAME plus where the
 * `pages.<name>` accessor lives so the output can be rewritten to the real
 * key. `rewrite` is null when the head is a frontmatter-bound local ident
 * (the frontmatter RHS is rewritten instead, via `frontmatterAccessor`).
 */
function flatArrayName(
  head: string,
  frontmatterCode: string
): { name: string; viaBinding: boolean } | null {
  const importMatch = frontmatterCode.match(
    /import\s+(\w+)\s+from\s+["'][^"']*_?pages\.json["']/
  );
  const pagesIdent = importMatch?.[1];
  if (!pagesIdent) return null;
  const segments = head.split(".");
  // pages.<name>.map — single-segment names only under flat
  if (segments.length === 2 && segments[0] === pagesIdent) {
    return { name: segments[1], viaBinding: false };
  }
  // const <local> = pages.<name>  →  <local>.map
  if (segments.length === 1) {
    const bound = frontmatterCode.match(
      new RegExp(`const\\s+${segments[0]}\\s*=\\s*${pagesIdent}\\.([\\w$]+)\\b`)
    )?.[1];
    if (bound) return { name: bound, viaBinding: true };
  }
  return null;
}

/**
 * Scan a parsed page for wireable `.map()` expressions and return the stamp
 * splices + bootstrap additions. Never throws for an individual loop — a
 * loop that can't be wired safely is skipped whole.
 */
export function loopWiring(
  ast: AstroNode,
  frontmatterCode: string,
  source: string,
  context: LoopWiringContext
): LoopWiringResult {
  const splices: Splice[] = [];
  const additions: AutoAddition[] = [];
  const arrayKeys: string[] = [];

  walk(ast, (node, ancestors) => {
    if (node.type === "frontmatter") return false;
    if (!isExpression(node)) return;

    // Expression subtrees are handled here in full; never descend (nested
    // maps inside are item-scoped, not page arrays).
    const handled = wireOne(node, ancestors);
    if (handled) {
      splices.push(...handled.splices);
      additions.push(...handled.additions);
      arrayKeys.push(handled.arrayKey);
    }
    return false;
  });

  return { splices, additions, arrayKeys };

  function wireOne(
    expr: AstroNode,
    ancestors: AstroNode[]
  ): { splices: Splice[]; additions: AutoAddition[]; arrayKey: string } | null {
    if (subtreeAdopted(expr)) return null; // already wired

    const children = expr.children ?? [];
    const header = children[0];
    if (header?.type !== "text" || header.value === undefined) return null;
    const match = MAP_HEADER_RE.exec(header.value);
    if (!match) return null;
    const [, head, sliceStart, openParen, itemVar, indexVar, closeParen] = match;
    const sliceOffset = sliceStart !== undefined ? Number(sliceStart) : null;

    // Single-root arrow body only.
    const roots = children.filter((child) => child.type === "element");
    if (roots.length !== 1) return null;
    const itemRoot = roots[0];
    if (itemRoot.position?.start?.offset === undefined || !itemRoot.name) {
      return null;
    }

    let arrayKey: string | null = null;
    let flatRewrite: { name: string; viaBinding: boolean } | null = null;
    let viaLift = false;
    if (context.flat && context.localArrays?.has(head)) {
      arrayKey = context.localArrays.get(head)!;
      viaLift = true; // RHS already rewritten + items seeded by the lift
    } else if (context.flat) {
      flatRewrite = flatArrayName(head, frontmatterCode);
      if (!flatRewrite) return null;
      const name = flatRewrite.name;
      if (Array.isArray(context.pageJson[name])) {
        // The dev wrote the EXACT key (`pages.features_gr1d`) — use verbatim.
        arrayKey = name;
      } else if (/^[\w$]+_[a-z0-9]{4}$/.test(name)) {
        // Written name already LOOKS minted (e.g. after the JSON was wiped):
        // reseed under that same key — never mint a double-suffixed dup.
        arrayKey = name;
      } else {
        // Rediscover the minted key (`<name>_<4>` array), else mint one.
        const keyRe = new RegExp(`^${name}_[a-z0-9]{4}$`);
        arrayKey =
          Object.keys(context.pageJson).find(
            (key) => keyRe.test(key) && Array.isArray(context.pageJson[key])
          ) ?? `${name}_${(context.rng ?? randomSuffix)()}`;
      }
    } else {
      arrayKey = pageArrayKey(head, frontmatterCode, context.pageKey);
    }
    if (!arrayKey) return null;

    const existing = getAtPath(context.pageJson, arrayKey);
    if (existing !== undefined && !Array.isArray(existing)) {
      context.warn(
        `[cms-bridge auto] loop over "${arrayKey}" skipped — page JSON value is not an array`
      );
      return null;
    }

    // Host = nearest element ancestor of the expression.
    const host = [...ancestors]
      .reverse()
      .find((ancestor) => ancestor.type === "element");
    if (!host || host.position?.start?.offset === undefined || !host.name) {
      return null;
    }
    if (getAttr(host, "data-cms-field")) return null;

    const out: Splice[] = [];

    // Index param: reuse the arrow's, or splice one in.
    let index = indexVar;
    if (!index) {
      index = itemVar === "i" ? "idx" : "i";
      const headerStart = header.position?.start?.offset;
      if (headerStart === undefined) return null;
      const paramText = `${openParen}${itemVar}${closeParen}`;
      const relAt = header.value.lastIndexOf(paramText);
      if (relAt < 0) return null;
      const replacement = openParen
        ? `(${itemVar}, ${index})`
        : `(${itemVar}, ${index})`;
      out.push({
        start: headerStart + relAt,
        end: headerStart + relAt + paramText.length,
        replacement,
      });
    }

    // Flat: rewrite the dev-written accessor to the real key — OUTPUT only.
    // ALWAYS rewritten (even when name === key) with an `?? []` guard: on the
    // very first build after seeding, the imported JSON module predates the
    // seed flush, and an unguarded access would crash the render.
    if (context.flat && flatRewrite) {
      const importMatch = frontmatterCode.match(
        /import\s+(\w+)\s+from\s+["'][^"']*_?pages\.json["']/
      );
      const pagesIdent = importMatch![1];
      const accessor = `${pagesIdent}.${flatRewrite.name}`;
      const replacement = `(${pagesIdent}["${arrayKey}"] ?? [])`;
      if (flatRewrite.viaBinding) {
        // Rewrite the frontmatter RHS: const X = pages.<name>
        const frontmatterStart = source.indexOf("---") + 3;
        const at = frontmatterCode.indexOf(accessor);
        if (at < 0) return null;
        verifySlice(source, frontmatterStart + at, accessor);
        out.push({
          start: frontmatterStart + at,
          end: frontmatterStart + at + accessor.length,
          replacement,
        });
      } else {
        // Rewrite in the map header: pages.<name>.map(
        const headerStart = header.position?.start?.offset;
        if (headerStart === undefined) return null;
        const at = header.value.indexOf(accessor);
        if (at < 0) return null;
        verifySlice(source, headerStart + at, accessor);
        out.push({
          start: headerStart + at,
          end: headerStart + at + accessor.length,
          replacement,
        });
      }
    }

    // Members address the array by ABSOLUTE index (slice windows offset it).
    const idxExpr =
      sliceOffset !== null && sliceOffset > 0 ? `${index} + ${sliceOffset}` : index;

    // Host + item-root stamps — skipped for sliced maps: two hosts over
    // windows of one array would let reindexGroup renumber from 0 per host
    // and corrupt it. Members stay inline-editable; count changes are dev's.
    if (sliceOffset === null) {
      out.push(
        attrInjectSplice(
          source,
          host.position.start.offset,
          host.name,
          ` data-cms-field="${arrayKey}" data-cms-kind="group"`
        )
      );
      out.push(
        attrInjectSplice(
          source,
          itemRoot.position.start.offset,
          itemRoot.name,
          ` data-cms-item={${index}}`
        )
      );
    }

    // Members inside the item root.
    const memberRoles = new Map<string, "text" | "media" | "link">();
    const accessorRe = new RegExp(`^\\s*${itemVar}\\.([\\w$][\\w$.]*)\\s*$`);
    walk(itemRoot, (member) => {
      if (member.type !== "element" || !member.name) return;
      if (member.position?.start?.offset === undefined) return;
      if (getAttr(member, "data-cms-field")) return false;

      // <img src={item.key}> → media member.
      if (member.name === "img") {
        const src = getAttr(member, "src");
        const srcKey =
          src && src.kind !== "quoted"
            ? accessorRe.exec(src.value ?? "")?.[1]
            : undefined;
        if (srcKey) {
          out.push(
            attrInjectSplice(
              source,
              member.position.start.offset,
              member.name,
              ` data-cms-field={\`${arrayKey}.\${${idxExpr}}.${srcKey}\`} data-cms-kind="media"`
            )
          );
          memberRoles.set(srcKey, "media");
        }
        return false;
      }

      // <a href={item.key}>…</a> → link member.
      if (member.name === "a") {
        const href = getAttr(member, "href");
        const hrefKey =
          href && href.kind !== "quoted"
            ? accessorRe.exec(href.value ?? "")?.[1]
            : undefined;
        if (hrefKey) {
          out.push(
            attrInjectSplice(
              source,
              member.position.start.offset,
              member.name,
              ` data-cms-field={\`${arrayKey}.\${${idxExpr}}.${hrefKey}\`} data-cms-kind="link"`
            )
          );
          memberRoles.set(hrefKey, "link");
          return false;
        }
      }

      // Element whose only meaningful child is {item.key} → text member.
      const meaningful = (member.children ?? []).filter(
        (child) => !(child.type === "text" && (child.value ?? "").trim() === "")
      );
      if (meaningful.length === 1 && isExpression(meaningful[0])) {
        const key = accessorRe.exec(expressionCode(meaningful[0]))?.[1];
        if (key) {
          out.push(
            attrInjectSplice(
              source,
              member.position.start.offset,
              member.name,
              ` data-cms-field={\`${arrayKey}.\${${idxExpr}}.${key}\`} data-cms-kind="text"`
            )
          );
          memberRoles.set(key, "text");
          return false;
        }
      }
    });

    // Bootstrap: a map over a missing array renders nothing and gives the
    // canvas no add-clone template — seed ONE placeholder item shaped from
    // every `<itemVar>.<key>` accessor in the arrow body (add-only; an
    // existing array is never touched).
    const bootstrap: AutoAddition[] = [];
    if (existing === undefined && !viaLift) {
      const item: Record<string, unknown> = {};
      const allAccessors = new RegExp(`\\b${itemVar}\\.([\\w$]+)`, "g");
      const code = collectSubtreeCode(expr);
      let accessor: RegExpExecArray | null;
      while ((accessor = allAccessors.exec(code)) !== null) {
        const key = accessor[1];
        if (key in item) continue;
        const role = memberRoles.get(key);
        item[key] =
          role === "media" ? "" : role === "link" ? "#" : titleCase(key);
      }
      if (Object.keys(item).length > 0) {
        bootstrap.push({ path: arrayKey, value: [item] });
      }
    }

    return { splices: out, additions: bootstrap, arrayKey };
  }
}

function collectSubtreeCode(node: AstroNode): string {
  let code = "";
  walk(node, (inner) => {
    if (inner.type === "text") code += `${inner.value ?? ""}\n`;
    for (const attr of inner.attributes ?? []) {
      if (attr.kind !== "quoted") code += `${attr.value ?? ""}\n`;
    }
  });
  return code;
}
