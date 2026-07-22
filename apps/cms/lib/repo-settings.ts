/**
 * Per-repository settings (currently just the monorepo "base path").
 *
 * The base path lets Pages CMS operate inside a subfolder of the repository
 * (e.g. `frontend`) for monorepos. When set:
 * - `.pages.yml` is loaded from `{basePath}/.pages.yml`.
 * - Every collection `path` and media `input` in the config is resolved
 *   relative to `{basePath}` (see `rebaseConfigObject`).
 *
 * Stored per-repo (owner/repo) so it's set once and applies to all branches.
 * An empty base path means "repository root" — identical to the legacy behavior.
 */

import { db } from "@/db";
import { repoSettingsTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { joinPathSegments, normalizePath } from "@/lib/utils/file";

const normalizeBasePath = (basePath: string): string => {
  if (!basePath) return "";
  return normalizePath(basePath.replace(/^\/+|\/+$/g, ""));
};

const getBasePath = async (owner: string, repo: string): Promise<string> => {
  if (!owner || !repo) return "";

  const row = await db.query.repoSettingsTable.findFirst({
    where: sql`lower(${repoSettingsTable.owner}) = lower(${owner}) and lower(${repoSettingsTable.repo}) = lower(${repo})`,
  });

  return normalizeBasePath(row?.basePath ?? "");
};

const setBasePath = async (
  owner: string,
  repo: string,
  basePath: string,
): Promise<string> => {
  const normalized = normalizeBasePath(basePath);
  const match = sql`lower(${repoSettingsTable.owner}) = lower(${owner}) and lower(${repoSettingsTable.repo}) = lower(${repo})`;

  // Manual upsert: the unique index is on the expressions (lower(owner),
  // lower(repo)), which `onConflictDoUpdate` can't target in this drizzle
  // version, so update first and insert only when no row matched.
  const updated = await db
    .update(repoSettingsTable)
    .set({ basePath: normalized, updatedAt: new Date() })
    .where(match)
    .returning({ id: repoSettingsTable.id });

  if (updated.length === 0) {
    await db.insert(repoSettingsTable).values({
      owner: owner.toLowerCase(),
      repo: repo.toLowerCase(),
      basePath: normalized,
    });
  }

  return normalized;
};

/**
 * Resolve the physical location of the config file given a base path.
 * Returns `.pages.yml` when the base path is empty.
 */
const resolveConfigFilePath = (basePath: string): string =>
  joinPathSegments([basePath, ".pages.yml"]) || ".pages.yml";

/**
 * Prepend the base path to every collection/file `path` and media `input` in a
 * normalized config object so the whole downstream pipeline operates in a single
 * physical-path space. Media `output` is intentionally left untouched (see the
 * image field's `swapPrefix` round-trip). No-op when the base path is empty.
 *
 * Must run AFTER `normalizeConfig`, which strips leading/trailing slashes.
 */
const rebaseConfigObject = (
  configObject: Record<string, any>,
  basePath: string,
): Record<string, any> => {
  if (!basePath || !configObject || typeof configObject !== "object") {
    return configObject;
  }

  const rebased = JSON.parse(JSON.stringify(configObject));

  if (Array.isArray(rebased.content)) {
    rebased.content = rebased.content.map((item: any) => {
      if (item && typeof item.path === "string") {
        item.path = joinPathSegments([basePath, item.path]);
      }
      return item;
    });
  }

  if (Array.isArray(rebased.media)) {
    rebased.media = rebased.media.map((mediaConfig: any) => {
      if (mediaConfig && typeof mediaConfig.input === "string") {
        mediaConfig.input = joinPathSegments([basePath, mediaConfig.input]);
      }
      return mediaConfig;
    });
  }

  return rebased;
};

export {
  getBasePath,
  setBasePath,
  normalizeBasePath,
  resolveConfigFilePath,
  rebaseConfigObject,
};
