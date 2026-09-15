/**
 * Per-project contract discovery for auto mode.
 *
 * Combined layout (current): root `_site.json` ({ cms, seo, variables }) +
 * root `_pages.json`. Legacy layout: `src/data/{cms,pages,variables}.json`.
 * Prefer combined, fall back to legacy — same rule as `cms-bridge check`.
 */

import fs from "node:fs";
import path from "node:path";

import { readJsonAt } from "../cli/core/json-store.js";
import { pageKeyForRoute, type CmsManifest } from "../cli/core/manifest.js";
import { entryNameForPage, routeForPage } from "../cli/core/routes.js";

export type ProjectContract = {
  layout: "combined" | "legacy";
  root: string;
  /** Absolute path of the pages JSON file that gets seeded. */
  pagesFile: string;
  manifest: CmsManifest | null;
  /**
   * `cms.version === 2` ⇒ FLAT contract: `_pages.json` is one flat map (no
   * page nesting, globally unique keys), binding spans ALL `src/**` .astro
   * files (components included). Version 1 / legacy ⇒ nested, pages-only.
   */
  flat: boolean;
};

export function discoverContract(root: string): ProjectContract {
  const siteFile = path.join(root, "_site.json");
  if (fs.existsSync(siteFile)) {
    const site = readJsonAt(siteFile);
    const manifest = (site?.cms as CmsManifest) ?? null;
    return {
      layout: "combined",
      root,
      pagesFile: path.join(root, "_pages.json"),
      manifest,
      flat: (manifest as { version?: number } | null)?.version === 2,
    };
  }
  return {
    layout: "legacy",
    root,
    pagesFile: path.join(root, "src/data/pages.json"),
    manifest: readJsonAt(path.join(root, "src/data/cms.json")),
    flat: false,
  };
}

/**
 * Page key for a file under src/pages: adopt the manifest route mapping when
 * present, else derive from the filename (`index` → `home`).
 * Returns null for dynamic routes.
 */
export function pageKeyForFile(
  contract: ProjectContract,
  relToPages: string
): string | null {
  const route = routeForPage(relToPages);
  if (route === null) return null;
  if (contract.manifest) {
    const adopted = pageKeyForRoute(contract.manifest, route);
    if (adopted) return adopted;
  }
  return entryNameForPage(relToPages);
}
