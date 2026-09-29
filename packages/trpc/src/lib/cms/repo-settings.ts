/**
 * Per-repository settings, stored as columns on `hubProject` (owner/repo, so
 * set once and applied to all branches):
 *
 * - **basePath** lets Client Hub operate inside a subfolder for monorepos
 *   (e.g. `frontend`). When set, the cms.json manifest and every collection
 *   `path` / media `input` are resolved relative to it. Empty = repository
 *   root (legacy behavior).
 * - **mediaProvider** selects where media is stored/browsed. ImageKit is the
 *   only provider today, so this is effectively fixed — kept as a column for
 *   future providers. No provider-specific config is stored.
 *
 * Rows are created by the import flow, so the setters are UPDATE-only — a repo
 * must already be a project before its settings can be written (it always is,
 * since you can't open a repo's settings unless it's listed).
 */

import { sql } from "drizzle-orm";

import { db } from "./db";
import { orgRepoTable } from "./db";

import {
  DEFAULT_MEDIA_PROVIDER,
  isMediaProviderId,
  toPublicMediaConfig,
  type MediaProviderId,
} from "@workspace/cms-core/media-providers";
import { normalizePath } from "@workspace/cms-core/utils/file";

type MediaSettings = {
  provider: MediaProviderId;
  config: Record<string, string>;
};

const matchRepo = (owner: string, repo: string) =>
  sql`lower(${orgRepoTable.owner}) = lower(${owner}) and lower(${orgRepoTable.repo}) = lower(${repo})`;

const normalizeBasePath = (basePath: string): string => {
  if (!basePath) return "";
  return normalizePath(basePath.replace(/^\/+|\/+$/g, ""));
};

const getBasePath = async (owner: string, repo: string): Promise<string> => {
  if (!owner || !repo) return "";

  const row = await db.query.hubProject.findFirst({
    where: matchRepo(owner, repo),
  });

  return normalizeBasePath(row?.basePath ?? "");
};

const setBasePath = async (
  owner: string,
  repo: string,
  basePath: string
): Promise<string> => {
  const normalized = normalizeBasePath(basePath);

  await db
    .update(orgRepoTable)
    .set({ basePath: normalized })
    .where(matchRepo(owner, repo));

  return normalized;
};

/**
 * Full media settings. SERVER-ONLY — use `getPublicMediaSettings` for anything
 * browser-bound. ImageKit is the sole provider and declares no config fields,
 * so `config` is always empty; the stored `mediaProvider` is not read back.
 * Args kept for call-site compatibility (manifest-store).
 */
const getMediaSettings = async (
  _owner?: string,
  _repo?: string
): Promise<MediaSettings> => {
  return { provider: DEFAULT_MEDIA_PROVIDER, config: {} };
};

/** Media settings with secrets stripped — safe to send to the browser. */
const getPublicMediaSettings = async (
  owner?: string,
  repo?: string
): Promise<MediaSettings> => {
  const { provider, config } = await getMediaSettings(owner, repo);
  return { provider, config: toPublicMediaConfig(provider, config) };
};

/** Persist the media provider. No provider-specific config is stored. */
const setMediaSettings = async (
  owner: string,
  repo: string,
  provider: MediaProviderId
): Promise<MediaSettings> => {
  if (!isMediaProviderId(provider)) {
    throw new Error(`Unknown media provider: ${provider}`);
  }

  await db
    .update(orgRepoTable)
    .set({ mediaProvider: provider })
    .where(matchRepo(owner, repo));

  return { provider, config: {} };
};

export {
  getBasePath,
  setBasePath,
  getMediaSettings,
  getPublicMediaSettings,
  setMediaSettings,
  normalizeBasePath,
  type MediaSettings,
};
