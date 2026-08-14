/**
 * GitHub org repo helpers shared by the cms router and the CMS engine.
 * Extracted from routers/cms.ts so the engine can read the org PAT and the
 * repo sync can run in-process (e.g. from the portfolio webhook).
 */

import { TRPCError } from "@trpc/server";
import { notInArray, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { cmsOrgRepo } from "@workspace/drizzle/schema";

type OrgRepo = {
  repoId: number;
  owner: string;
  repo: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
};

const getGithubEnv = () => {
  const org = process.env.GITHUB_ORG;
  const token = process.env.GITHUB_TOKEN;

  if (!org || !token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "GITHUB_ORG and GITHUB_TOKEN must be set",
    });
  }

  return { org, token };
};

const fetchOrgRepos = async (): Promise<OrgRepo[]> => {
  const { org, token } = getGithubEnv();
  const repos: OrgRepo[] = [];

  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/orgs/${org}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `GitHub org repos request failed (${response.status})`,
      });
    }

    const data: any[] = await response.json();

    repos.push(
      ...data.map((repo) => ({
        repoId: repo.id,
        owner: repo.owner?.login ?? org,
        repo: repo.name,
        private: Boolean(repo.private),
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
      }))
    );

    if (data.length < perPage) break;
    page++;
  }

  return repos;
};

// Full reconcile: upsert every org repo by GitHub id, drop rows no longer in the org.
const syncOrgRepos = async () => {
  const repos = await fetchOrgRepos();
  const syncedAt = new Date();

  const chunkSize = 100;
  for (let i = 0; i < repos.length; i += chunkSize) {
    const chunk = repos.slice(i, i + chunkSize);

    await db
      .insert(cmsOrgRepo)
      .values(
        chunk.map((repo) => ({
          repoId: repo.repoId,
          owner: repo.owner,
          repo: repo.repo,
          private: repo.private,
          defaultBranch: repo.defaultBranch,
          githubUpdatedAt: new Date(repo.updatedAt),
          syncedAt,
        }))
      )
      .onConflictDoUpdate({
        target: cmsOrgRepo.repoId,
        set: {
          owner: sql`excluded.owner`,
          repo: sql`excluded.repo`,
          private: sql`excluded.private`,
          defaultBranch: sql`excluded.default_branch`,
          githubUpdatedAt: sql`excluded.github_updated_at`,
          syncedAt: sql`excluded.synced_at`,
        },
      });
  }

  const repoIds = repos.map((repo) => repo.repoId);
  await db
    .delete(cmsOrgRepo)
    .where(repoIds.length ? notInArray(cmsOrgRepo.repoId, repoIds) : sql`true`);

  return { synced: repos.length };
};

export { fetchOrgRepos, getGithubEnv, syncOrgRepos };
