import { cacheLife, cacheTag, revalidateTag } from "next/cache";
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

const ORG_REPOS_CACHE_TAG = "cms-org-repos";

const listOrgRepos = async (): Promise<OrgRepo[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(ORG_REPOS_CACHE_TAG);

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
    // Called by the CMS webhook when org repos change (created/deleted/renamed).
    revalidateRepos: internalProcedure.mutation(() => {
      revalidateTag(ORG_REPOS_CACHE_TAG, "max");
      return { revalidated: true };
    }),
  }),
});
