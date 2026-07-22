import { TRPCError } from "@trpc/server";
import { desc, ilike, notInArray, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { cmsOrgRepo } from "@workspace/drizzle/schema";
import {
  adminProcedure,
  createTRPCRouter,
  internalProcedure,
} from "@workspace/trpc/init";

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
    .where(
      repoIds.length ? notInArray(cmsOrgRepo.repoId, repoIds) : sql`true`
    );

  return { synced: repos.length };
};

export const cmsRouter = createTRPCRouter({
  listRepos: adminProcedure
    .input(z.object({ keyword: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const keyword = input?.keyword?.trim();

      const selectRepos = () =>
        db
          .select()
          .from(cmsOrgRepo)
          .where(keyword ? ilike(cmsOrgRepo.repo, `%${keyword}%`) : undefined)
          .orderBy(desc(cmsOrgRepo.githubUpdatedAt));

      let rows = await selectRepos();

      // Seed on first read after deploy so the picker is never empty.
      if (rows.length === 0 && !keyword) {
        await syncOrgRepos();
        rows = await selectRepos();
      }

      return rows.map((row) => ({
        owner: row.owner,
        repo: row.repo,
        private: row.private,
        defaultBranch: row.defaultBranch,
        updatedAt: row.githubUpdatedAt.toISOString(),
      }));
    }),
  // Refresh button in the CMS repo picker.
  syncRepos: adminProcedure.mutation(() => syncOrgRepos()),
  internal: createTRPCRouter({
    getGithubToken: internalProcedure.query(() => {
      const { token } = getGithubEnv();
      return { token };
    }),
    // Called by the CMS webhook when org repos change (created/deleted/renamed).
    syncRepos: internalProcedure.mutation(() => syncOrgRepos()),
  }),
});
