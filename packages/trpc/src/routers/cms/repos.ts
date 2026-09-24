import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import z from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  collaboratorProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { createHttpError, toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { getRepoSnapshot } from "@workspace/trpc/lib/cms/github-cache-file";
import { getToken } from "@workspace/trpc/lib/cms/token";
import { db } from "@workspace/drizzle/index";
import { hubProject, hubSubscription } from "@workspace/drizzle/schema";

// Every project is a hub_project row (created by the import flow). Pure DB
// listing, optionally scoped to one owner + a repo-name keyword.
const listProjectRows = async (owner?: string, keyword?: string) => {
  const trimmed = keyword?.trim();

  const rows = await db
    .select()
    .from(hubProject)
    // Exclude Danger-tab tombstones (hidden) from every listing.
    .where(
      and(
        eq(hubProject.hidden, false),
        owner ? sql`lower(${hubProject.owner}) = lower(${owner})` : undefined,
        trimmed ? ilike(hubProject.repo, `%${trimmed}%`) : undefined
      )
    )
    .orderBy(desc(hubProject.githubUpdatedAt));

  return rows.map((row) => ({
    owner: row.owner,
    repo: row.repo,
    private: row.private,
    defaultBranch: row.defaultBranch,
    updatedAt: row.githubUpdatedAt.toISOString(),
    websiteUrl: row.websiteUrl ?? null,
  }));
};

/**
 * The owner login for a repo when the URL carries only the repo name. Reads
 * hub_project. Prefers the row the caller connected GitHub for, then any row;
 * undefined when no project row exists (getSnapshot then 404s).
 */
const resolveOwnerForRepo = async (
  userId: string,
  repo: string
): Promise<string | undefined> => {
  const rows = await db
    .select({
      owner: hubProject.owner,
      githubConnectedUserId: hubProject.githubConnectedUserId,
    })
    .from(hubProject)
    .where(
      and(
        eq(hubProject.hidden, false),
        sql`lower(${hubProject.repo}) = lower(${repo})`
      )
    );
  if (rows.length === 0) return undefined;
  const mine = rows.find((r) => r.githubConnectedUserId === userId);
  return (mine ?? rows[0]).owner;
};

export const reposRouter = createTRPCRouter({
  listRepos: adminProcedure
    .input(z.object({ keyword: z.string().optional() }).optional())
    .query(async ({ input }) => listProjectRows(undefined, input?.keyword)),

  /**
   * GitHub accounts the current user can act as. Admins act as every owner that
   * has a project; collaborators get the distinct owners they were invited to.
   */
  listAccounts: collaboratorProcedure.query(async ({ ctx }) => {
    try {
      // Admins act as every owner that has a (non-hidden) project.
      if (!ctx.collaborations) {
        const owners = await db
          .selectDistinct({ owner: hubProject.owner })
          .from(hubProject)
          .where(eq(hubProject.hidden, false));
        return owners.map((o) => ({
          login: o.owner,
          type: "org",
          repositorySelection: "all",
        }));
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

      // Also include owners of the caller's own imported projects — the user
      // who connected GitHub gets access without a collaborator invite, so the
      // owner must surface here for the project to appear in the gallery.
      const selfOwners = await db
        .selectDistinct({ owner: hubProject.owner })
        .from(hubProject)
        .where(
          and(
            eq(hubProject.hidden, false),
            eq(hubProject.githubConnectedUserId, ctx.session.user.id)
          )
        );
      for (const { owner } of selfOwners) {
        if (!accountByOwner.has(owner.toLowerCase())) {
          accountByOwner.set(owner.toLowerCase(), {
            login: owner,
            type: "org",
            repositorySelection: "selected",
          });
        }
      }

      return Array.from(accountByOwner.values());
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  // Every project the caller can access — derived entirely from the session.
  // No owner/keyword input: the set is small (one hub_project row per project),
  // so the account switcher and search filter it client-side.
  listMine: collaboratorProcedure.query(async ({ ctx }) => {
    try {
      const conds: (SQL | undefined)[] = [eq(hubProject.hidden, false)];

      // Admins see every project. Everyone else sees repos they collaborate on,
      // plus their own imported repos — the user who connected GitHub gets
      // access without a collaborator invite.
      if (!ctx.isAdmin) {
        const collabConds = (ctx.collaborations ?? []).map((c) =>
          and(
            sql`lower(${hubProject.owner}) = lower(${c.owner})`,
            sql`lower(${hubProject.repo}) = lower(${c.repo})`
          )
        );
        const ownConnected = eq(
          hubProject.githubConnectedUserId,
          ctx.session.user.id
        );
        conds.push(or(ownConnected, ...collabConds));
      }

      // One query: project rows + their plan (left join, so free-for-life
      // projects with no subscription still surface). websiteUrl is the
      // project's own stored URL.
        const rows = await db
          .select({
            owner: hubProject.owner,
            repo: hubProject.repo,
            repoId: hubProject.repoId,
            private: hubProject.private,
            defaultBranch: hubProject.defaultBranch,
            updatedAt: hubProject.githubUpdatedAt,
            freeLife: hubProject.freeLife,
            websiteUrl: hubProject.websiteUrl,
            plan: hubSubscription.plan,
            status: hubSubscription.status,
          })
          .from(hubProject)
          .leftJoin(
            hubSubscription,
            eq(hubSubscription.repoId, hubProject.repoId)
          )
          .where(and(...conds))
          .orderBy(desc(hubProject.githubUpdatedAt));

        return rows.map((row) => ({
          owner: row.owner,
          repo: row.repo,
          private: row.private,
          defaultBranch: row.defaultBranch,
          updatedAt: row.updatedAt.toISOString(),
          websiteUrl: row.websiteUrl ?? null,
          plan: row.plan ?? null,
          status: row.status ?? null,
          freeLife: row.freeLife,
        }));
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
        const owner =
          input.owner ??
          (await resolveOwnerForRepo(ctx.session.user.id, input.repo));
        if (!owner) throw createHttpError("Project not found", 404);

        const { token, role } = await getToken(
          ctx.session.user,
          owner,
          input.repo
        );
        if (!token) throw createHttpError("Token not found", 401);

        // Spread copy: the snapshot is module-cached per repo and shared
        // across users — the caller's role must never be written into it.
        let snapshot;
        try {
          snapshot = await getRepoSnapshot(owner, input.repo, token);
        } catch (snapshotError) {
          // We already confirmed the project exists (owner resolved) and the
          // caller has Hub access (getToken). So a GitHub 404/403 here means
          // the caller's own GitHub account can't reach the repo — a distinct,
          // actionable case, NOT "repository removed".
          const status =
            (snapshotError as { status?: number; statusCode?: number })
              ?.status ??
            (snapshotError as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 403) {
            throw new TRPCError({
              code: "UNPROCESSABLE_CONTENT",
              message: `Your connected GitHub account can't access "${owner}/${input.repo}". You have access to this project in Client Hub, but not to its GitHub repository — ask the repository owner to add you as a collaborator on GitHub (with repository access), then reconnect your GitHub here.`,
            });
          }
          throw snapshotError;
        }

        // The project's stored live URL (used by the thumbnail/preview + hooks).
        const [project] = await db
          .select({ websiteUrl: hubProject.websiteUrl })
          .from(hubProject)
          .where(
            and(
              sql`lower(${hubProject.owner}) = lower(${owner})`,
              sql`lower(${hubProject.repo}) = lower(${input.repo})`
            )
          )
          .limit(1);

        return { ...snapshot, myRole: role, websiteUrl: project?.websiteUrl ?? null };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
