/**
 * Per-repository settings: the monorepo "base path" and the media provider.
 *
 * The base path lets Client Hub operate inside a subfolder of the repository
 * (e.g. `frontend`) for monorepos. When set:
 * - `.pages.yml` is loaded from `{basePath}/.pages.yml`.
 * - Every collection `path` and media `input` in the config is resolved
 *   relative to `{basePath}` (see `rebaseConfigObject`).
 *
 * The media provider selects where media is stored/browsed (GitHub repo by
 * default, or a hosted service like ImageKit). Provider-specific config lives
 * in the `mediaConfig` jsonb column; secrets in it are server-only — anything
 * sent to the browser must go through `getPublicMediaSettings`.
 *
 * Stored per-repo (owner/repo) so it's set once and applies to all branches.
 * An empty base path means "repository root" — identical to the legacy behavior.
 */

import { sql } from "drizzle-orm";

import { db } from "./db";
import { repoSettingsTable } from "./db";

import {
  DEFAULT_MEDIA_PROVIDER,
  getMediaProvider,
  isMediaProviderId,
  toPublicMediaConfig,
  type MediaProviderId,
} from "@workspace/cms-core/media-providers";
import { joinPathSegments, normalizePath } from "@workspace/cms-core/utils/file";

type MediaSettings = {
  provider: MediaProviderId;
  config: Record<string, string>;
};

const normalizeBasePath = (basePath: string): string => {
  if (!basePath) return "";
  return normalizePath(basePath.replace(/^\/+|\/+$/g, ""));
};

const getBasePath = async (owner: string, repo: string): Promise<string> => {
  if (!owner || !repo) return "";

  const row = await db.query.cmsRepoSettings.findFirst({
    where: sql`lower(${repoSettingsTable.owner}) = lower(${owner}) and lower(${repoSettingsTable.repo}) = lower(${repo})`,
  });

  return normalizeBasePath(row?.basePath ?? "");
};

const setBasePath = async (
  owner: string,
  repo: string,
  basePath: string
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
 * Full media settings including secrets. SERVER-ONLY — never return this to
 * the client; use `getPublicMediaSettings` for anything browser-bound.
 */
const getMediaSettings = async (
  owner: string,
  repo: string
): Promise<MediaSettings> => {
  if (!owner || !repo) {
    return { provider: DEFAULT_MEDIA_PROVIDER, config: {} };
  }

  const row = await db.query.cmsRepoSettings.findFirst({
    where: sql`lower(${repoSettingsTable.owner}) = lower(${owner}) and lower(${repoSettingsTable.repo}) = lower(${repo})`,
  });

  const provider = isMediaProviderId(row?.mediaProvider)
    ? row.mediaProvider
    : DEFAULT_MEDIA_PROVIDER;

  return { provider, config: row?.mediaConfig ?? {} };
};

/** Media settings with secrets stripped — safe to send to the browser. */
const getPublicMediaSettings = async (
  owner: string,
  repo: string
): Promise<MediaSettings> => {
  const { provider, config } = await getMediaSettings(owner, repo);
  return { provider, config: toPublicMediaConfig(provider, config) };
};

/**
 * Persist the media provider and its config. Only keys declared in the
 * provider's registry entry are kept. Secret fields submitted as empty
 * strings keep their previously stored value (write-only inputs).
 */
const setMediaSettings = async (
  owner: string,
  repo: string,
  provider: MediaProviderId,
  config: Record<string, string>
): Promise<MediaSettings> => {
  if (!isMediaProviderId(provider)) {
    throw new Error(`Unknown media provider: ${provider}`);
  }

  const { config: storedConfig } = await getMediaSettings(owner, repo);

  const nextConfig: Record<string, string> = {};
  for (const field of getMediaProvider(provider).configFields) {
    const incoming =
      typeof config[field.key] === "string" ? config[field.key].trim() : "";
    const value = !incoming && !field.public
      ? (storedConfig[field.key] ?? "")
      : incoming;
    if (value) nextConfig[field.key] = value;
  }

  const match = sql`lower(${repoSettingsTable.owner}) = lower(${owner}) and lower(${repoSettingsTable.repo}) = lower(${repo})`;

  // Manual upsert, same as `setBasePath` (the unique index is on expressions).
  const updated = await db
    .update(repoSettingsTable)
    .set({
      mediaProvider: provider,
      mediaConfig: nextConfig,
      updatedAt: new Date(),
    })
    .where(match)
    .returning({ id: repoSettingsTable.id });

  if (updated.length === 0) {
    await db.insert(repoSettingsTable).values({
      owner: owner.toLowerCase(),
      repo: repo.toLowerCase(),
      mediaProvider: provider,
      mediaConfig: nextConfig,
    });
  }

  return { provider, config: nextConfig };
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
  basePath: string
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
  getMediaSettings,
  getPublicMediaSettings,
  setMediaSettings,
  normalizeBasePath,
  resolveConfigFilePath,
  rebaseConfigObject,
  type MediaSettings,
};
