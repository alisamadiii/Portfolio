import { TRPCError } from "@trpc/server";
import { and, desc, ilike, sql } from "drizzle-orm";
import z from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { cmsOrgRepo } from "@workspace/drizzle/schema";

import { isAdminUser } from "@workspace/trpc/lib/cms/authz-shared";
import { collaboratorMatchesUser } from "@workspace/trpc/lib/cms/collaborator-access";
import { collaboratorTable, db as cmsDb } from "@workspace/trpc/lib/cms/db";
import { createHttpError, toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { getRepoSnapshot } from "@workspace/trpc/lib/cms/github-cache-file";
import { syncOrgRepos } from "@workspace/trpc/lib/cms/org-repos";
import { toCmsUser } from "@workspace/trpc/lib/cms/session-user";
import { getToken } from "@workspace/trpc/lib/cms/token";

// Org repo listing shared by `listRepos` (admin picker) and the admin path of
// `listMine`. Seeds the table on first read after deploy so it's never empty.
const listOrgRepos = async (keyword?: string) => {
  const trimmed = keyword?.trim();

  const selectRepos = () =>
    db
      .select()
      .from(cmsOrgRepo)
      .where(trimmed ? ilike(cmsOrgRepo.repo, `%${trimmed}%`) : undefined)
      .orderBy(desc(cmsOrgRepo.githubUpdatedAt));

  let rows = await selectRepos();

  // Seed on first read after deploy so the picker is never empty.
  if (rows.length === 0 && !trimmed) {
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
};

const listRepos = adminProcedure
  .input(z.object({ keyword: z.string().optional() }).optional())
  .query(async ({ input }) => listOrgRepos(input?.keyword));

// Refresh button in the CMS repo picker.
const syncRepos = adminProcedure.mutation(() => syncOrgRepos());

/**
 * GitHub accounts the current user can act as (port of hub's lib/accounts).
 * Admins act as the org; collaborators get the distinct owners they were
 * invited to. Keeps GITHUB_ORG out of the hub app entirely.
 */
const listAccounts = authenticatedProcedure.query(async ({ ctx }) => {
  try {
    const user = toCmsUser(ctx.session.user);

    if (isAdminUser(user)) {
      const org = process.env.GITHUB_ORG;
      if (!org) throw createHttpError("Missing GITHUB_ORG.", 500);

      return [{ login: org, type: "org", repositorySelection: "all" }];
    }

    // The CMS Neon WebSocket pool can drop a query on cold start; one retry
    // keeps a transient blip from crashing the whole app on entry.
    const runQuery = () =>
      cmsDb
        .selectDistinct({
          owner: collaboratorTable.owner,
          type: collaboratorTable.type,
        })
        .from(collaboratorTable)
        .where(collaboratorMatchesUser(user));

    let groupedRepos;
    try {
      groupedRepos = await runQuery();
    } catch {
      groupedRepos = await runQuery();
    }

    return groupedRepos.map((collaborator) => ({
      login: collaborator.owner,
      type: collaborator.type,
      repositorySelection: "selected",
    }));
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw toTRPCError(error);
  }
});

/**
 * Repositories visible to the current user (port of GET /api/repos/[owner]).
 * Admins get the org repo list (when `owner` matches the org); everyone also
 * sees repos they were invited to as collaborators, deduped by owner/repo.
 */
const listMine = authenticatedProcedure
  .input(z.object({ owner: z.string(), keyword: z.string().optional() }))
  .query(async ({ input, ctx }) => {
    try {
      const user = ctx.session.user;

      let githubRepos: any[] = [];

      const org = process.env.GITHUB_ORG;

      if (
        isAdminUser(user) &&
        org &&
        input.owner.toLowerCase() === org.toLowerCase()
      ) {
        githubRepos = await listOrgRepos(input.keyword);
      }

      const collaboratorRepos = await cmsDb.query.cmsCollaborator.findMany({
        where: and(
          collaboratorMatchesUser(user),
          sql`lower(${collaboratorTable.owner}) = lower(${input.owner})`
        ),
      });

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
          reposByKey.set(key, repo);
        }
      }

      return Array.from(reposByKey.values());
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

/**
 * Repo metadata + branch list (port of what the [owner]/[repo] layout resolved
 * server-side: getToken + getRepoSnapshot). Access control = getToken.
 */
const getSnapshot = authenticatedProcedure
  .input(z.object({ owner: z.string().optional(), repo: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const owner = input.owner ?? process.env.GITHUB_ORG;
      if (!owner) throw createHttpError("Missing GITHUB_ORG.", 500);

      const user = toCmsUser(ctx.session.user);

      const { token } = await getToken(user, owner, input.repo);
      if (!token) throw createHttpError("Token not found", 401);

      return getRepoSnapshot(owner, input.repo, token);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

const reposRouter = createTRPCRouter({
  listRepos,
  syncRepos,
  listAccounts,
  listMine,
  getSnapshot,
});

export { reposRouter };
