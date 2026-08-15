import type { Config } from "@workspace/cms-core/types/config";

/**
 * Canvas-side mapping between site pages and CMS entries.
 *
 * A page shows fields from (a) the entry routed to it via
 * `settings.preview.paths` (or the `home`/`/<name>` default) and (b) "global"
 * entries rendered on every page (header/footer — `settings.preview.global`,
 * defaulting to a file entry named `site`). A field path reported by the
 * bridge is resolved to the first candidate entry whose schema contains it —
 * route-matched entries win over globals.
 */

export type EntryRoute = {
  name: string;
  /** Physical content file path (schema.path). */
  filePath: string;
  schema: Record<string, any>;
  /** Normalized route pathname, e.g. "/menu". `null` for globals-only. */
  route: string | null;
};

export type CanvasEntryMap = {
  routes: EntryRoute[];
  /** Entry names present on every page, in resolution order after route matches. */
  globals: string[];
  byName: Map<string, EntryRoute>;
};

const normalizeRoute = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname || "/";
};

/** Flatten `content` (groups included) into file-type entry schemas. */
function flattenFileEntries(content: any[]): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  for (const item of content ?? []) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "group") {
      out.push(...flattenFileEntries(item.items ?? []));
      continue;
    }
    if (item.type === "file") out.push(item);
  }
  return out;
}

export function buildEntryMap(config: Config | null): CanvasEntryMap {
  const object: any = config?.object ?? {};
  const settings = object.settings && typeof object.settings === "object" ? object.settings : {};
  const previewPaths: Record<string, string> = settings.preview?.paths ?? {};

  const fileEntries = flattenFileEntries(object.content ?? []);
  const routes: EntryRoute[] = [];
  const byName = new Map<string, EntryRoute>();

  for (const schema of fileEntries) {
    const name: string = schema.name;
    const template =
      previewPaths[name] ?? (name === "home" ? "/" : `/${name}`);
    // Templated (per-entry collection) routes are out of scope for v1.
    const route = template.includes("{") ? null : normalizeRoute(template);
    const entry: EntryRoute = {
      name,
      filePath: schema.path,
      schema,
      route,
    };
    routes.push(entry);
    byName.set(name, entry);
  }

  const configured: string[] | undefined = settings.preview?.global;
  const globals =
    configured ?? (byName.has("site") ? ["site"] : []);

  return { routes, globals, byName };
}

/**
 * Entries whose fields can appear on `pathname`, in resolution order:
 * route-matched first, then globals (deduped).
 */
export function candidatesFor(
  map: CanvasEntryMap,
  pathname: string
): EntryRoute[] {
  const normalized = normalizeRoute(pathname);
  const matched = map.routes.filter((entry) => entry.route === normalized);
  const seen = new Set(matched.map((entry) => entry.name));
  for (const name of map.globals) {
    if (seen.has(name)) continue;
    const entry = map.byName.get(name);
    if (entry) {
      matched.push(entry);
      seen.add(name);
    }
  }
  return matched;
}

/**
 * Walk a dot-path (with numeric list indices) through a field schema.
 * Returns the terminal field, or `undefined` when the schema doesn't contain
 * the path. A numeric segment is only consumed when the current field is a
 * list (`getFieldByPath` in cms-core doesn't handle indices — this does).
 */
export function schemaFieldAtPath(
  fields: Array<Record<string, any>> | undefined,
  path: string
): Record<string, any> | undefined {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return undefined;
  let scope = fields ?? [];
  let field: Record<string, any> | undefined;
  for (const segment of segments) {
    if (/^\d+$/.test(segment)) {
      if (!field || field.list !== true) return undefined;
      continue; // index into the same field's list — scope unchanged
    }
    field = scope.find((candidate) => candidate?.name === segment);
    if (!field) return undefined;
    scope = field.fields ?? [];
  }
  return field;
}

/** Field types the canvas edits as plain text (v1). */
export const TEXT_FIELD_TYPES = new Set(["string", "text", "number"]);

/**
 * Resolve which candidate entry a reported field path belongs to. First
 * schema-membership match wins; warns when the path is ambiguous.
 */
export function resolveFieldEntry(
  candidates: EntryRoute[],
  fieldPath: string
): { entry: EntryRoute; field: Record<string, any> } | null {
  const matches: Array<{ entry: EntryRoute; field: Record<string, any> }> = [];
  for (const entry of candidates) {
    const field = schemaFieldAtPath(entry.schema.fields, fieldPath);
    if (field) matches.push({ entry, field });
  }
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    console.warn(
      `[canvas] Field "${fieldPath}" matches multiple entries (${matches
        .map((match) => match.entry.name)
        .join(", ")}) — using "${matches[0]!.entry.name}". Keep top-level keys unique.`
    );
  }
  return matches[0]!;
}

/**
 * Sort the field paths a page reported (`data-cms-field` values) into the
 * editable whitelist the bridge expects: `media` (images), `link` (url-typed
 * strings — an anchor href), `arm` (everything else that resolves to a schema
 * field, edited inline as text). Paths that resolve to NO field are dropped —
 * the bridge leaves them inert (no phantom editable, no error).
 */
export function classifyEditable(
  candidates: EntryRoute[],
  fields: string[]
): { arm: string[]; media: string[]; link: string[] } {
  const arm: string[] = [];
  const media: string[] = [];
  const link: string[] = [];
  for (const path of fields) {
    const resolved = resolveFieldEntry(candidates, path);
    if (!resolved) continue;
    const field = resolved.field;
    if (field.type === "image") media.push(path);
    else if (field.type === "string" && field.options?.type === "url")
      link.push(path);
    else arm.push(path);
  }
  return { arm, media, link };
}

/** Immutably set a dot-path (numeric segments = array indices) in a values object. */
export function setValueAtPath(
  values: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const segments = path.split(".").filter(Boolean);
  const root: any = Array.isArray(values) ? [...(values as any)] : { ...values };
  let cursor: any = root;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const key: string | number = /^\d+$/.test(segment)
      ? parseInt(segment, 10)
      : segment;
    if (i === segments.length - 1) {
      cursor[key] = value;
      break;
    }
    const nextSegment = segments[i + 1]!;
    const existing = cursor[key];
    const copy =
      existing && typeof existing === "object"
        ? Array.isArray(existing)
          ? [...existing]
          : { ...existing }
        : /^\d+$/.test(nextSegment)
          ? []
          : {};
    cursor[key] = copy;
    cursor = copy;
  }
  return root;
}

/**
 * Flatten a values object into `[{path, value}]` pairs for string/number
 * leaves — the payload pushed into iframes so pages reflect drafts.
 */
export function flattenTextValues(
  values: unknown,
  prefix = ""
): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  const visit = (node: unknown, path: string) => {
    if (node === null || node === undefined) return;
    if (typeof node === "string" || typeof node === "number") {
      if (path) out.push({ path, value: String(node) });
      return;
    }
    if (typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, index) =>
        visit(item, path ? `${path}.${index}` : String(index))
      );
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(values, prefix);
  return out;
}
