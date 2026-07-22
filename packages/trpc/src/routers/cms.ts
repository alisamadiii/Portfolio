import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  internalProcedure,
} from "@workspace/trpc/init";

type OrgRepo = {
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

let orgReposCache: { repos: OrgRepo[]; fetchedAt: number } | null = null;
const ORG_REPOS_CACHE_TTL = 60_000;

const listOrgRepos = async (): Promise<OrgRepo[]> => {
  if (orgReposCache && Date.now() - orgReposCache.fetchedAt < ORG_REPOS_CACHE_TTL) {
    return orgReposCache.repos;
  }

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

  orgReposCache = { repos, fetchedAt: Date.now() };
  return repos;
};

export const cmsRouter = createTRPCRouter({
  listRepos: adminProcedure
    .input(z.object({ keyword: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const repos = await listOrgRepos();
      const keyword = input?.keyword?.trim().toLowerCase();

      if (!keyword) return repos;
      return repos.filter((repo) => repo.repo.toLowerCase().includes(keyword));
    }),
  internal: createTRPCRouter({
    getGithubToken: internalProcedure.query(() => {
      const { token } = getGithubEnv();
      return { token };
    }),
  }),
});
