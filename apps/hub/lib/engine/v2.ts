/**
 * CMS v2 canvas engine: builds the same `CanvasEntryMap` the legacy canvas
 * consumes, but from the cms.json manifest + the two content files instead of
 * a `.pages.yml` schema. Each manifest page becomes an EntryRoute whose
 * `schema.fields` are INFERRED from the page's JSON values (see infer.ts) and
 * whose `filePath` is the shared pages.json; the global `site` entry maps to
 * site.json. Field paths stay page-relative (`hero.heading`) exactly like
 * legacy — the page prefix only appears when assembling the pages.json draft.
 */

import type { CanvasEntryMap, EntryRoute } from "@/lib/canvas-entries";

import { inferFields, labelize } from "./infer";

export type ManifestData = {
  sha: string;
  object: {
    version: 1;
    baseUrl: string;
    media?: { input: string; output: string };
    pages: Record<string, { route: string; title?: string }>;
    collections: Array<{
      name: string;
      path: string;
      route?: string;
      label?: string;
      format?: "md" | "json";
      fields: Array<{
        name: string;
        type: string;
        label?: string;
        required?: boolean;
        options?: string[];
      }>;
    }>;
    paths: { manifest: string; pages: string; variables: string; seo: string };
  };
};

const normalizeRoute = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/"))
    return pathname.slice(0, -1);
  return pathname || "/";
};

export const SITE_ENTRY = "site";
/** Reserved entry name for the shared pages.json draft (never a page key). */
export const PAGES_DOC = "$pages";

export function buildV2EntryMap(
  manifest: ManifestData | null,
  pagesContent: Record<string, unknown> | null,
  siteContent: Record<string, unknown> | null
): CanvasEntryMap {
  const routes: EntryRoute[] = [];
  const byName = new Map<string, EntryRoute>();
  if (!manifest) return { routes, globals: [], byName };

  const { pages, paths } = manifest.object;

  for (const [name, page] of Object.entries(pages)) {
    const values = (pagesContent?.[name] ?? {}) as Record<string, unknown>;
    const entry: EntryRoute = {
      name,
      filePath: paths.pages,
      schema: {
        name,
        label: page.title ?? labelize(name),
        type: "file",
        path: paths.pages,
        format: "json",
        fields: inferFields(values),
      },
      route: normalizeRoute(page.route),
    };
    routes.push(entry);
    byName.set(name, entry);
  }

  const siteEntry: EntryRoute = {
    name: SITE_ENTRY,
    filePath: paths.variables,
    schema: {
      name: SITE_ENTRY,
      label: "Variables",
      type: "file",
      path: paths.variables,
      format: "json",
      fields: inferFields(siteContent ?? {}),
    },
    route: null,
  };
  routes.push(siteEntry);
  byName.set(SITE_ENTRY, siteEntry);

  return { routes, globals: [SITE_ENTRY], byName };
}

/**
 * Assemble the full pages.json object for a draft: the committed base content
 * overlaid with every page's current working values. Site drafts are just the
 * site entry's values — no assembly needed.
 */
export function assemblePagesDraft(
  base: Record<string, unknown> | null,
  pageValues: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(base ?? {}) };
  for (const [name, values] of pageValues) out[name] = values;
  return out;
}
