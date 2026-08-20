import { TRPCError } from "@trpc/server";
import { desc, ilike, sql } from "drizzle-orm";
import z from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  collaboratorProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { createHttpError, toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { getRepoSnapshot } from "@workspace/trpc/lib/cms/github-cache-file";
import { syncOrgRepos } from "@workspace/trpc/lib/cms/org-repos";
import { getToken } from "@workspace/trpc/lib/cms/token";
import { getWebsiteUrlsByRepoId } from "@workspace/trpc/lib/vercel/domains";

// Org repo listing shared by `listRepos` (admin picker) and the admin path of
// `listMine`. Seeds the table on first read after deploy so it's never empty.
const listOrgRepos = async (keyword?: string) => {
  const trimmed = keyword?.trim();

  const selectRepos = () =>
    db
      .select()
      .from(hubProject)
      .where(trimmed ? ilike(hubProject.repo, `%${trimmed}%`) : undefined)
      .orderBy(desc(hubProject.githubUpdatedAt));

  let rows = await selectRepos();

  // Seed on first read after deploy so the picker is never empty.
  if (rows.length === 0 && !trimmed) {
    await syncOrgRepos();
    rows = await selectRepos();
  }

  // websiteUrl is derived from the repo's Vercel domains (hub_domain).
  const urlByRepoId = await getWebsiteUrlsByRepoId(rows.map((r) => r.repoId));

  return rows.map((row) => ({
    owner: row.owner,
    repo: row.repo,
    private: row.private,
    defaultBranch: row.defaultBranch,
    updatedAt: row.githubUpdatedAt.toISOString(),
    websiteUrl: urlByRepoId.get(row.repoId) ?? null,
  }));
};

export const reposRouter = createTRPCRouter({
  listRepos: adminProcedure
    .input(z.object({ keyword: z.string().optional() }).optional())
    .query(async ({ input }) => listOrgRepos(input?.keyword)),

  // Refresh button in the CMS repo picker.
  syncRepos: adminProcedure.mutation(() => syncOrgRepos()),

  /**
   * GitHub accounts the current user can act as (port of hub's lib/accounts).
   * Admins act as the org; collaborators get the distinct owners they were
   * invited to. Keeps GITHUB_ORG out of the hub app entirely.
   */
  listAccounts: collaboratorProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.collaborations) {
        const org = process.env.GITHUB_ORG;
        if (!org) throw createHttpError("Missing GITHUB_ORG.", 500);

        return [{ login: org, type: "org", repositorySelection: "all" }];
      }

      const accountByOwner = new Map<
        string,
        { login: string; type: string; repositorySelection: string }
      >();
      for (const collaborator of ctx.collaborations) {
        accountByOwner.set(collaborator.owner.toLowerCase(), {
          login: collaborator.owner,
          type: collaborator.type,
          repositorySelection: "selected",
        });
      }

      return Array.from(accountByOwner.values());
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /**
   * Repositories visible to the current user (port of GET /api/repos/[owner]).
   * Admins get the org repo list (when `owner` matches the org); everyone also
   * sees repos they were invited to as collaborators, deduped by owner/repo.
   */
  listMine: collaboratorProcedure
    .input(z.object({ owner: z.string(), keyword: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        let githubRepos: any[] = [];

        const org = process.env.GITHUB_ORG;

        if (
          ctx.isAdmin &&
          org &&
          input.owner.toLowerCase() === org.toLowerCase()
        ) {
          githubRepos = await listOrgRepos(input.keyword);
        }

        const collaboratorRepos = (ctx.collaborations ?? []).filter(
          (c) => c.owner.toLowerCase() === input.owner.toLowerCase()
        );

        // websiteUrl is derived from hub_domain rows keyed by repoId;
        // collaborator rows don't carry it, so look it up for this owner and
        // attach it (used by the home page gallery).
        let urlByRepo = new Map<string, string | null>();
        if (collaboratorRepos.length) {
          const orgRows = await db
            .select({ repo: hubProject.repo, repoId: hubProject.repoId })
            .from(hubProject)
            .where(sql`lower(${hubProject.owner}) = lower(${input.owner})`);
          const urlByRepoId = await getWebsiteUrlsByRepoId(
            orgRows.map((r) => r.repoId)
          );
          urlByRepo = new Map(
            orgRows.map((r) => [
              r.repo.toLowerCase(),
              urlByRepoId.get(r.repoId) ?? null,
            ])
          );
        }

        const reposByKey = new Map<string, any>();
        for (const repo of githubRepos) {
          reposByKey.set(
            `${repo.owner.toLowerCase()}::${repo.repo.toLowerCase()}`,
            repo
          );
        }
        for (const repo of collaboratorRepos) {
          const key = `${repo.owner.toLowerCase()}::${repo.repo.toLowerCase()}`;
          if (!reposByKey.has(key)) {
            reposByKey.set(key, {
              ...repo,
              websiteUrl: urlByRepo.get(repo.repo.toLowerCase()) ?? null,
            });
          }
        }

        return Array.from(reposByKey.values());
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /**
   * Repo metadata + branch list (port of what the [owner]/[repo] layout resolved
   * server-side: getToken + getRepoSnapshot). Access control = getToken.
   */
  getSnapshot: authenticatedProcedure
    .input(z.object({ owner: z.string().optional(), repo: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const owner = input.owner ?? process.env.GITHUB_ORG;
        if (!owner) throw createHttpError("Missing GITHUB_ORG.", 500);

        const { token, role } = await getToken(
          ctx.session.user,
          owner,
          input.repo
        );
        if (!token) throw createHttpError("Token not found", 401);

        // Spread copy: the snapshot is module-cached per repo and shared
        // across users — the caller's role must never be written into it.
        const snapshot = await getRepoSnapshot(owner, input.repo, token);
        return { ...snapshot, myRole: role };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
