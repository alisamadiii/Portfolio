import z from "zod";

import { authenticatedProcedure, createTRPCRouter } from "../../init";
import { getConfig } from "../../lib/cms/config-store";
import { createHttpError, runCms } from "../../lib/cms/errors";
import { getToken } from "../../lib/cms/token";
import { type User } from "../../lib/cms/types";

/**
 * Page discovery for the canvas view: crawl the live site's sitemap and union
 * it with `settings.preview.paths` (the sitemap is absent on `astro dev` and
 * may be stale in prod — mapped entries must always appear).
 */

const SITEMAP_TIMEOUT_MS = 5_000;
const MAX_CHILD_SITEMAPS = 3;
const MAX_PAGES = 200;

export type CanvasPage = {
  /** Normalized pathname, e.g. "/menu". */
  path: string;
  /** Full URL on the live site (no cms-preview param — the canvas adds it). */
  url: string;
  title: string;
  /** Entry name when the page came from `settings.preview.paths`. */
  entry?: string;
};

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) out.push(match[1]);
  return out;
}

async function fetchXml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/xml, text/xml" },
      signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function crawlSitemap(baseUrl: string): Promise<string[]> {
  let xml =
    (await fetchXml(new URL("/sitemap.xml", baseUrl).href)) ??
    (await fetchXml(new URL("/sitemap-index.xml", baseUrl).href));
  if (!xml) return [];

  if (xml.includes("<sitemapindex")) {
    const children = extractLocs(xml).slice(0, MAX_CHILD_SITEMAPS);
    const results = await Promise.all(children.map((loc) => fetchXml(loc)));
    return results
      .filter((child): child is string => child !== null)
      .flatMap(extractLocs)
      .slice(0, MAX_PAGES);
  }
  return extractLocs(xml).slice(0, MAX_PAGES);
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
  list: authenticatedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      runCms(async () => {
        const user = ctx.session.user as User;
        const { token } = await getToken(user, input.owner, input.repo);
        if (!token) throw createHttpError("Token not found", 401);

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
          settings && typeof settings === "object"
            ? settings.baseUrl
            : undefined;
        if (!baseUrl || typeof baseUrl !== "string") {
          throw createHttpError(
            "No `settings.baseUrl` configured — the canvas needs the site's live URL.",
            400
          );
        }

        const byPath = new Map<string, CanvasPage>();

        // Mapped entries first — they carry the entry name for editing.
        const previewPaths: Record<string, string> | undefined =
          settings && typeof settings === "object"
            ? settings.preview?.paths
            : undefined;
        for (const [entry, template] of Object.entries(previewPaths ?? {})) {
          if (template.includes("{")) continue; // per-entry collection routes: out of scope v1
          try {
            const url = new URL(template, baseUrl);
            const pathname = normalizePathname(url.pathname);
            if (!byPath.has(pathname)) {
              byPath.set(pathname, {
                path: pathname,
                url: url.href,
                title: pathname === "/" ? "Home" : titleFromPath(pathname),
                entry,
              });
            }
          } catch {
            // Ignore malformed templates.
          }
        }

        // Sitemap union — pages without CMS entries still show (view-only).
        const origin = new URL(baseUrl).origin;
        for (const loc of await crawlSitemap(baseUrl)) {
          let url: URL;
          try {
            url = new URL(loc);
          } catch {
            continue;
          }
          // Sitemaps list canonical prod URLs; keep the pathname but serve
          // from the configured baseUrl (which may be a localhost override).
          const pathname = normalizePathname(url.pathname);
          if (byPath.has(pathname)) continue;
          if (byPath.size >= MAX_PAGES) break;
          byPath.set(pathname, {
            path: pathname,
            url: new URL(pathname, origin).href,
            title: pathname === "/" ? "Home" : titleFromPath(pathname),
          });
        }

        if (byPath.size === 0) {
          byPath.set("/", {
            path: "/",
            url: new URL("/", baseUrl).href,
            title: "Home",
          });
        }

        const pages = Array.from(byPath.values()).sort((a, b) => {
          if (a.path === "/") return -1;
          if (b.path === "/") return 1;
          return a.path.localeCompare(b.path);
        });

        return { baseUrl, origin, pages };
      })
    ),
});
