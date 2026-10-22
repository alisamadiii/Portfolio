/**
 * Per-repository settings, stored as columns on `hubProject` (owner/repo, so
 * set once and applied to all branches):
 *
 * - **basePath** lets Client Hub operate inside a subfolder for monorepos
 *   (e.g. `frontend`). When set, the cms.json manifest and every collection
 *   `path` / media `input` are resolved relative to it. Empty = repository
 *   root (legacy behavior).
 *
 * Rows are created by the import flow, so the setters are UPDATE-only — a repo
 * must already be a project before its settings can be written (it always is,
 * since you can't open a repo's settings unless it's listed).
 */

import { sql } from "drizzle-orm";

import { db } from "./db";
import { orgRepoTable } from "./db";

import { normalizePath } from "@workspace/cms-core/utils/file";

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

export { getBasePath, normalizeBasePath };
