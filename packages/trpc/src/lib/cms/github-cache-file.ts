/**
 * Manage cached GitHub repository snapshots, branch heads, and file/media trees.
 */

import { and, eq } from "drizzle-orm";

import { Repo } from "./types";

import { db } from "./db";
import { cacheFileTable } from "./db";

import { createOctokitInstance } from "./octokit";

type BranchHeadInfo = {
  sha: string;
  timestamp: number;
};

type BranchHeadCacheEntry = {
  sha: string;
  timestamp: number;
  expiresAt: number;
};

type RepoSnapshotCacheEntry = {
  value: Repo;
  expiresAt: number;
};

const BRANCH_HEAD_TTL_MS = parseInt(
  process.env.BRANCH_HEAD_TTL_MS || "15000",
  10
);
const REPO_META_TTL_MS = parseInt(process.env.REPO_META_TTL_MS || "15000", 10);
const branchHeadCache = new Map<string, BranchHeadCacheEntry>();
const branchHeadInFlight = new Map<string, Promise<BranchHeadInfo>>();
const repoSnapshotCache = new Map<string, RepoSnapshotCacheEntry>();
const repoSnapshotInFlight = new Map<string, Promise<Repo>>();

const getBranchHeadCacheKey = (owner: string, repo: string, branch: string) =>
  `${owner.toLowerCase()}::${repo.toLowerCase()}::${branch}`;

const getRepoSnapshotCacheKey = (owner: string, repo: string) =>
  `${owner.toLowerCase()}::${repo.toLowerCase()}`;

const setBranchHeadInfo = (
  owner: string,
  repo: string,
  branch: string,
  info: BranchHeadInfo
) => {
  const key = getBranchHeadCacheKey(owner, repo, branch);
  branchHeadCache.set(key, {
    sha: info.sha,
    timestamp: info.timestamp,
    expiresAt: Date.now() + BRANCH_HEAD_TTL_MS,
  });
};

const getBranchHeadInfo = async (
  owner: string,
  repo: string,
  branch: string,
  token: string,
  options?: { force?: boolean }
): Promise<BranchHeadInfo> => {
  const key = getBranchHeadCacheKey(owner, repo, branch);

  if (!options?.force) {
    const cached = branchHeadCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        sha: cached.sha,
        timestamp: cached.timestamp,
      };
    }
  }

  const inFlight = branchHeadInFlight.get(key);
  if (inFlight) return inFlight;

  const job = (async () => {
    const octokit = createOctokitInstance(token);
    const response = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });
    const timestampValue =
      response.data.commit.commit?.committer?.date ??
      response.data.commit.commit?.author?.date ??
      null;
    const parsedTimestamp = timestampValue
      ? Date.parse(timestampValue)
      : Number.NaN;
    const info = {
      sha: response.data.commit.sha,
      timestamp: Number.isNaN(parsedTimestamp) ? Date.now() : parsedTimestamp,
    };
    setBranchHeadInfo(owner, repo, branch, info);
    return info;
  })();

  branchHeadInFlight.set(key, job);
  try {
    return await job;
  } finally {
    branchHeadInFlight.delete(key);
  }
};

const getBranchHeadSha = async (
  owner: string,
  repo: string,
  branch: string,
  token: string,
  options?: { force?: boolean }
): Promise<string> => {
  const info = await getBranchHeadInfo(owner, repo, branch, token, options);
  return info.sha;
};

const getRepoSnapshot = async (
  owner: string,
  repo: string,
  token: string,
  options?: { force?: boolean }
): Promise<Repo> => {
  const key = getRepoSnapshotCacheKey(owner, repo);

  if (!options?.force) {
    const cached = repoSnapshotCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
  }

  const inFlight = repoSnapshotInFlight.get(key);
  if (inFlight) return inFlight;

  const job = (async () => {
    const octokit = createOctokitInstance(token);
    const [repoResponse, firstBranchesResponse] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.listBranches({ owner, repo, page: 1, per_page: 100 }),
    ]);

    const branches = [...firstBranchesResponse.data];
    let page = 2;
    let lastPageCount = firstBranchesResponse.data.length;
    while (lastPageCount === 100) {
      const branchesResponse = await octokit.rest.repos.listBranches({
        owner,
        repo,
        page,
        per_page: 100,
      });
      lastPageCount = branchesResponse.data.length;
      if (lastPageCount === 0) break;
      branches.push(...branchesResponse.data);
      page++;
    }

    const value: Repo = {
      id: repoResponse.data.id,
      owner: repoResponse.data.owner.login,
      ownerId: repoResponse.data.owner.id,
      repo: repoResponse.data.name,
      defaultBranch: repoResponse.data.default_branch,
      branches: branches.map((branchItem) => branchItem.name),
      isPrivate: repoResponse.data.private,
    };

    repoSnapshotCache.set(key, {
      value,
      expiresAt: Date.now() + REPO_META_TTL_MS,
    });
    return value;
  })();

  repoSnapshotInFlight.set(key, job);
  try {
    return await job;
  } finally {
    repoSnapshotInFlight.delete(key);
  }
};

// Clear file cache entries
const clearFileCache = async (
  owner: string,
  repo?: string,
  branch?: string
) => {
  const conditions = [];
  conditions.push(eq(cacheFileTable.owner, owner.toLowerCase()));
  if (repo) {
    conditions.push(eq(cacheFileTable.repo, repo.toLowerCase()));
    if (branch) conditions.push(eq(cacheFileTable.branch, branch));
  }

  await db.delete(cacheFileTable).where(and(...conditions));
};

export {
  getBranchHeadInfo,
  getBranchHeadSha,
  getRepoSnapshot,
  clearFileCache,
};
