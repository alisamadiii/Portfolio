import { TRPCError } from "@trpc/server";
import z from "zod";

import { cmsProcedure, createTRPCRouter } from "../../init";
import { getConfig } from "../../lib/cms/config-store";
import { createHttpError, toTRPCError } from "../../lib/cms/errors";
import { getManifest } from "../../lib/cms/manifest-store";

/**
 * Page discovery for the canvas view. The single source of truth is
 * `settings.preview.paths` — each mapped content entry becomes one canvas
 * card. Pages without a CMS entry are intentionally not shown; the canvas is
 * for editing content, not mirroring the whole site.
 */

export type CanvasPage = {
  /** Normalized pathname, e.g. "/menu". */
  path: string;
  /** Full URL on the live site (no cms-preview param — the canvas adds it). */
  url: string;
  title: string;
  /** Entry name when the page came from `settings.preview.paths`. */
  entry?: string;
  /** "collection" for a table-linked card (no iframe); "page" otherwise. */
  kind?: "page" | "collection";
  /** Collection entry name — set only when `kind === "collection"`. */
  collection?: string;
  /**
   * For a collection, the normalized list path its detail route hangs off
   * (e.g. `/newsletter/{slug}` → `/newsletter`). The page tree nests the
   * collection under the page whose `path` equals this.
   */
  parentPath?: string;
};

/** Flatten `content` (groups included) into leaf entries keyed by name. */
function flattenEntries(content: unknown): Map<string, Record<string, any>> {
  const out = new Map<string, Record<string, any>>();
  const visit = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const node = item as Record<string, any>;
      if (node.type === "group") {
        visit(node.items);
        continue;
      }
      if (typeof node.name === "string") out.set(node.name, node);
    }
  };
  visit(content);
  return out;
}

/** Drop the `{…}` token segment(s) from a route template → the parent list path. */
function listPathFromTemplate(template: string): string {
  const kept = template
    .split("/")
    .filter((segment) => segment.length === 0 || !segment.includes("{"));
  return normalizePathname(kept.join("/") || "/");
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

function titleFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return "Home";
  const words = segment.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const pagesRouter = createTRPCRouter({
  list: cmsProcedure
    .input(z.object({ branch: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { token } = ctx;

        // CMS v2: tiles come straight from the cms.json manifest — one tile
        // per `pages` entry plus one table card per collection.
        const manifest = await getManifest(
          input.owner,
          input.repo,
          input.branch,
          { getToken: async () => token }
        );
        // Dev override: point every canvas iframe at a local server for
        // testing (e.g. CMS_PREVIEW_BASE_URL=http://localhost:4321), without
        // touching the client's committed cms.json baseUrl.
        const devBaseUrl = process.env.CMS_PREVIEW_BASE_URL;

        if (manifest) {
          const baseUrl = devBaseUrl || manifest.object.baseUrl;
          const origin = new URL(baseUrl).origin;
          const byPath = new Map<string, CanvasPage>();

          for (const [name, page] of Object.entries(manifest.object.pages)) {
            try {
              const url = new URL(page.route, baseUrl);
              const pathname = normalizePathname(url.pathname);
              if (!byPath.has(pathname)) {
                byPath.set(pathname, {
                  path: pathname,
                  url: url.href,
                  title:
                    page.title ??
                    (pathname === "/" ? "Home" : titleFromPath(pathname)),
                  entry: name,
                  kind: "page",
                });
              }
            } catch {
              // Ignore malformed routes.
            }
          }

          for (const collection of manifest.object.collections) {
            const template = collection.route;
            if (!template) continue;
            const key = normalizePathname(template);
            const listPath = listPathFromTemplate(template);
            if (!byPath.has(key)) {
              byPath.set(key, {
                path: key,
                url: new URL(listPath, baseUrl).href,
                title: collection.label ?? titleFromPath(listPath),
                entry: collection.name,
                kind: "collection",
                collection: collection.name,
                parentPath: listPath,
              });
            }
          }

          return { baseUrl, origin, pages: Array.from(byPath.values()) };
        }

        const config = await getConfig(input.owner, input.repo, input.branch, {
          getToken: async () => token,
        });
        if (!config)
          throw createHttpError(
            `Configuration not found for ${input.owner}/${input.repo}/${input.branch}.`,
            404
          );

        const settings = config.object?.settings;
        const baseUrl: unknown =
          devBaseUrl ||
          (settings && typeof settings === "object"
            ? settings.baseUrl
            : undefined);
        if (!baseUrl || typeof baseUrl !== "string") {
          throw createHttpError(
            "No `settings.baseUrl` configured — the canvas needs the site's live URL.",
            400
          );
        }
        const origin = new URL(baseUrl).origin;

        const byPath = new Map<string, CanvasPage>();
        const entriesByName = flattenEntries(config.object?.content);

        const previewPaths: Record<string, string> | undefined =
          settings && typeof settings === "object"
            ? settings.preview?.paths
            : undefined;
        for (const [entry, template] of Object.entries(previewPaths ?? {})) {
          const isCollection = entriesByName.get(entry)?.type === "collection";
          if (template.includes("{")) {
            // Templated route. A collection collapses to one table card; any
            // other templated entry stays out of scope (no single URL).
            if (!isCollection) continue;
            // The card's key is the template itself (e.g. /hervoice/{slug}) so
            // it never collides with the collection's own list page, which is a
            // separate `file` entry mapped to the parent path (/hervoice).
            const key = normalizePathname(template);
            const listPath = listPathFromTemplate(template);
            if (!byPath.has(key)) {
              byPath.set(key, {
                path: key,
                url: new URL(listPath, baseUrl).href,
                title:
                  entriesByName.get(entry)?.label ?? titleFromPath(listPath),
                entry,
                kind: "collection",
                collection: entry,
                parentPath: listPath,
              });
            }
            continue;
          }
          try {
            const url = new URL(template, baseUrl);
            const pathname = normalizePathname(url.pathname);
            if (!byPath.has(pathname)) {
              byPath.set(pathname, {
                path: pathname,
                url: url.href,
                title: pathname === "/" ? "Home" : titleFromPath(pathname),
                entry,
                kind: "page",
              });
            }
          } catch {
            // Ignore malformed templates.
          }
        }

        if (byPath.size === 0) {
          byPath.set("/", {
            path: "/",
            url: new URL("/", baseUrl).href,
            title: "Home",
          });
        }

        // Tile order follows `preview.paths` declaration order (byPath is built
        // in that order) — the author controls the canvas layout, not an
        // alphabetical sort.
        const pages = Array.from(byPath.values());

        return { baseUrl, origin, pages };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
