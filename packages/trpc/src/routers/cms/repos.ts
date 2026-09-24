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
import { revalidateRepoCache } from "@workspace/trpc/lib/cms/revalidate";
import { getIntegrationAccessToken } from "@workspace/trpc/lib/integrations";
import { db } from "@workspace/drizzle/index";
import { hubProject, hubSubscription } from "@workspace/drizzle/schema";

// ─── Agency-access gate ──────────────────────────────────────────
// A specific GitHub account (AGENCY_GITHUB_LOGIN) — the one whose PAT
// content-pilot commits with — must be a collaborator on every client repo, or
// the agency can't publish. The repo owner is prompted to add it.
const ghHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/** Whether the repo has a pending invitation for the agency account (the state
 * right after `grantAgencyAccess` until the agency accepts). Needs admin on the
 * caller's token; best-effort → false on any error. */
async function hasPendingAgencyInvite(
  owner: string,
  repo: string,
  login: string,
  token: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/invitations`,
      { headers: ghHeaders(token) }
    );
    if (!res.ok) return false;
    const invites = (await res.json()) as Array<{
      invitee?: { login?: string };
    }>;
    return invites.some(
      (i) => i.invitee?.login?.toLowerCase() === login.toLowerCase()
    );
  } catch {
    return false;
  }
}

/** Best-effort accept of a pending repo invitation from the agency account's
 * own stored token (only works when the importing user IS the agency account —
 * the invite only appears in that account's list). Never throws. */
async function acceptAgencyInvite(owner: string, repo: string) {
  try {
    const [row] = await db
      .select({ uid: hubProject.githubConnectedUserId })
      .from(hubProject)
      .where(
        and(
          eq(hubProject.hidden, false),
          sql`lower(${hubProject.repo}) = lower(${repo})`
        )
      )
      .limit(1);
    if (!row?.uid) return;
    const token = await getIntegrationAccessToken(row.uid, "github", "GitHub");
    const res = await fetch(
      "https://api.github.com/user/repository_invitations",
      { headers: ghHeaders(token) }
    );
    if (!res.ok) return;
    const invites = (await res.json()) as Array<{
      id: number;
      repository?: { full_name?: string };
    }>;
    const full = `${owner}/${repo}`.toLowerCase();
    const match = invites.find(
      (i) => i.repository?.full_name?.toLowerCase() === full
    );
    if (!match) return;
    await fetch(
      `https://api.github.com/user/repository_invitations/${match.id}`,
      { method: "PATCH", headers: ghHeaders(token) }
    );
  } catch {
    // Invite stays pending; the agency accepts it manually.
  }
}

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

        // Opening a project reconciles its cache with the live branch HEAD
        // (replaces the old push webhook). Best-effort — never blocks the open.
        if (snapshot.defaultBranch) {
          await revalidateRepoCache(
            owner,
            input.repo,
            snapshot.defaultBranch,
            token
          );
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

  /**
   * Is the agency GitHub account a collaborator on this repo? Uses the caller's
   * token — GitHub's collaborator-check needs push access, so a `missing`
   * result only reaches an admin (exactly who can fix it). Fails open: never
   * blocks a project on a transient error or an unset AGENCY_GITHUB_LOGIN.
   */
  agencyAccess: authenticatedProcedure
    .input(z.object({ repo: z.string() }))
    .query(async ({ input, ctx }) => {
      const login = process.env.AGENCY_GITHUB_LOGIN;
      if (!login) return { status: "ok" as const };
      try {
        const owner = await resolveOwnerForRepo(ctx.session.user.id, input.repo);
        if (!owner) return { status: "ok" as const };
        const { token } = await getToken(ctx.session.user, owner, input.repo);
        if (!token) return { status: "ok" as const };
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${input.repo}/collaborators/${login}`,
          { headers: ghHeaders(token) }
        );
        if (res.status === 204) return { status: "ok" as const };
        if (res.status === 404) {
          // Not a collaborator — but an invite may already be pending.
          const invited = await hasPendingAgencyInvite(
            owner,
            input.repo,
            login,
            token
          );
          return {
            status: invited ? ("invited" as const) : ("missing" as const),
            owner,
            login,
          };
        }
        if (res.status === 403) return { status: "not-admin" as const };
        return { status: "unknown" as const };
      } catch {
        return { status: "unknown" as const };
      }
    }),

  /**
   * Add the agency GitHub account as a collaborator (permission: push) using the
   * caller's token, then best-effort auto-accept the invitation. Requires the
   * caller to have admin on the repo; otherwise FORBIDDEN so the UI shows the
   * manual GitHub link.
   */
  grantAgencyAccess: authenticatedProcedure
    .input(z.object({ repo: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const login = process.env.AGENCY_GITHUB_LOGIN;
      if (!login) return { status: "active" as const };
      const owner = await resolveOwnerForRepo(ctx.session.user.id, input.repo);
      if (!owner) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      const { token } = await getToken(ctx.session.user, owner, input.repo);
      if (!token) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GitHub is not connected.",
        });
      }
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${input.repo}/collaborators/${login}`,
        {
          method: "PUT",
          headers: ghHeaders(token),
          body: JSON.stringify({ permission: "push" }),
        }
      );
      if (res.status === 403) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You need admin access on this repository to add a collaborator.",
        });
      }
      if (!res.ok && res.status !== 204) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `GitHub returned ${res.status} while adding the collaborator.`,
        });
      }
      // 204 = already a collaborator (or added directly for an org member).
      // 201 = a pending invitation was created — try to auto-accept it, then
      // report whether the agency account ended up active or still invited.
      if (res.status === 204) return { status: "active" as const };
      await acceptAgencyInvite(owner, input.repo);
      const check = await fetch(
        `https://api.github.com/repos/${owner}/${input.repo}/collaborators/${login}`,
        { headers: ghHeaders(token) }
      );
      return {
        status: check.status === 204 ? ("active" as const) : ("invited" as const),
      };
    }),
});
