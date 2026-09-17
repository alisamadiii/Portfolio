/**
 * GitHub org repo helpers shared by the cms router and the CMS engine.
 * Extracted from routers/cms.ts so the engine can read the org PAT and the
 * repo sync can run in-process (e.g. from the portfolio webhook).
 */

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import {
  hubBlogPost,
  hubCollaborator,
  hubDeployment,
  hubDomain,
  hubProject,
  hubSubscription,
} from "@workspace/drizzle/schema";

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

// Full reconcile: upsert every org repo by GitHub id, drop rows no longer in
// the org. Per-repo settings (basePath, mediaProvider, freeLife) are
// intentionally absent from the conflict set() below so they survive every
// re-sync.
const syncOrgRepos = async () => {
  const repos = await fetchOrgRepos();
  const syncedAt = new Date();

  const chunkSize = 100;
  for (let i = 0; i < repos.length; i += chunkSize) {
    const chunk = repos.slice(i, i + chunkSize);

    await db
      .insert(hubProject)
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
        target: hubProject.repoId,
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

  // Reconcile org repos only — never drop user-deployed projects (their repos
  // live outside GITHUB_ORG and would otherwise be deleted here).
  const repoIds = repos.map((repo) => repo.repoId);
  const stale = await db
    .select({ repoId: hubProject.repoId })
    .from(hubProject)
    .where(
      and(
        eq(hubProject.selfDeployed, false),
        repoIds.length ? notInArray(hubProject.repoId, repoIds) : sql`true`
      )
    );
  const staleIds = stale.map((r) => r.repoId);
  if (staleIds.length) {
    // App-level cascade: drop all project-scoped rows for the removed repos
    // before the project rows (no DB FKs — see schema).
    await deleteProjectsCascade(staleIds);
  }

  return { synced: repos.length };
};

/**
 * Delete a project and ALL its project-scoped rows (domains, deployments, blog
 * posts, subscription, collaborators). App-level cascade — the hub DB has no FK
 * cascade because hub_project.repo_id is a unique index, not a constraint.
 */
const deleteProjectsCascade = async (repoIds: number[]) => {
  if (!repoIds.length) return;
  await db.delete(hubDomain).where(inArray(hubDomain.repoId, repoIds));
  await db.delete(hubDeployment).where(inArray(hubDeployment.repoId, repoIds));
  await db.delete(hubBlogPost).where(inArray(hubBlogPost.repoId, repoIds));
  await db.delete(hubSubscription).where(inArray(hubSubscription.repoId, repoIds));
  await db.delete(hubCollaborator).where(inArray(hubCollaborator.repoId, repoIds));
  await db.delete(hubProject).where(inArray(hubProject.repoId, repoIds));
};

export { deleteProjectsCascade, fetchOrgRepos, getGithubEnv, syncOrgRepos };
