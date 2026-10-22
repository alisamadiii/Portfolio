import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

import {
  authenticatedProcedure,
  collaboratorProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { createHttpError, toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { assertRepoAccessByRepoId } from "@workspace/trpc/lib/cms/authz";
import { resolveProjectByRepoId } from "@workspace/trpc/lib/cms/repo-id";
import { accessibleProjectsWhere } from "@workspace/trpc/lib/cms/accessible-projects";
import { getRepoSnapshot } from "@workspace/trpc/lib/cms/github-cache-file";
import { getToken } from "@workspace/trpc/lib/cms/token";
import { parseHosting } from "@workspace/trpc/lib/hosting";
import { revalidateRepoCache } from "@workspace/trpc/lib/cms/revalidate";
import {
  installationForRepo,
  isGithubAppConfigured,
} from "@workspace/trpc/lib/github-app";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

export const reposRouter = createTRPCRouter({
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
      // websiteUrl is the project's own stored URL. Plans come from
      // plans.mine (usePlans on the client).
        const rows = await db
          .select({
            owner: hubProject.owner,
            repo: hubProject.repo,
            repoId: hubProject.repoId,
            source: hubProject.source,
            private: hubProject.private,
            defaultBranch: hubProject.defaultBranch,
            updatedAt: hubProject.githubUpdatedAt,
            websiteUrl: hubProject.websiteUrl,
          })
          .from(hubProject)
          .where(accessibleProjectsWhere(ctx))
          .orderBy(desc(hubProject.githubUpdatedAt));

        return rows.map((row) => ({
          owner: row.owner,
          repo: row.repo,
          repoId: row.repoId,
          source: row.source,
          private: row.private,
          defaultBranch: row.defaultBranch,
          updatedAt: row.updatedAt.toISOString(),
          websiteUrl: row.websiteUrl ?? null,
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
    .input(z.object({ repoId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        // repoId is globally unique in hub_project — resolves the exact project
        // (owner + name) and enforces the caller's Hub access in one step.
        const project = await assertRepoAccessByRepoId(
          ctx.session.user,
          input.repoId
        );
        const owner = project.owner;
        const repo = project.repo;

        const { token, role } = await getToken(
          ctx.session.user,
          input.repoId
        );

        // Uploaded projects have no GitHub repo: synthesize the snapshot from
        // the project row. One branch ('main'), always private, no cache
        // revalidation — the files live in content-pilot's workspace.
        if (project.source === "upload") {
          return {
            id: input.repoId,
            owner,
            ownerId: 0,
            repo,
            defaultBranch: project.defaultBranch,
            branches: [project.defaultBranch],
            isPrivate: true,
            repoId: input.repoId,
            myRole: role,
            isOwner: project.githubConnectedUserId === ctx.session.user.id,
            websiteUrl: project.websiteUrl ?? null,
            source: "upload" as const,
            hosting: parseHosting(project.hosting),
          };
        }

        if (!token) throw createHttpError("Token not found", 401);

        // Spread copy: the snapshot is module-cached per repo and shared
        // across users — the caller's role must never be written into it.
        let snapshot;
        try {
          snapshot = await getRepoSnapshot(owner, repo, token);
        } catch (snapshotError) {
          // We already confirmed the project exists (repoId resolved) and the
          // caller has Hub access (assertRepoAccessByRepoId). So a GitHub
          // 404/403 here means the App's installation can't reach the repo —
          // a distinct, actionable case, NOT "repository removed".
          const status =
            (snapshotError as { status?: number; statusCode?: number })
              ?.status ??
            (snapshotError as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 403) {
            throw new TRPCError({
              code: "UNPROCESSABLE_CONTENT",
              message: `The GitHub App can't access "${owner}/${repo}". The repository may have been renamed or removed from the app's repository access — update the app's installation to include it.`,
            });
          }
          throw snapshotError;
        }

        // Opening a project reconciles its cache with the live branch HEAD
        // (replaces the old push webhook). Best-effort — never blocks the open.
        if (snapshot.defaultBranch) {
          await revalidateRepoCache(owner, repo, snapshot.defaultBranch, token);
        }

        // websiteUrl (thumbnail/preview + hooks) and ownership both come from the
        // project row already loaded by assertRepoAccessByRepoId.
        const isOwner =
          project.githubConnectedUserId === ctx.session.user.id;

        return {
          ...snapshot,
          repoId: input.repoId,
          myRole: role,
          isOwner,
          websiteUrl: project.websiteUrl ?? null,
          source: "github" as const,
          hosting: parseHosting(project.hosting),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /**
   * Can the platform reach this repo? "ok" when the GitHub App's installation
   * covers it, "missing" when the owner needs to install (or fix) the app.
   * Fails open on transient errors — a GitHub blip never blocks a project.
   */
  installationStatus: authenticatedProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        const project = await resolveProjectByRepoId(input.repoId);
        if (!project) return { status: "ok" as const };
        // Uploaded projects have no GitHub repo to install anything on.
        if (project.source === "upload") return { status: "ok" as const };
        const { owner, repo } = project;

        if (isGithubAppConfigured()) {
          const covering = await installationForRepo(owner, repo).catch(
            () => null
          );
          if (covering) return { status: "ok" as const };
        }

        // Unconfigured server = honest "missing" with no install link: getToken
        // can't mint anything either way, so "ok" would just route the user to
        // a dead error card instead of the overlay's "ask the owner" hint.
        const appName = process.env.GITHUB_APP_NAME;
        return {
          status: "missing" as const,
          owner,
          repo,
          installUrl:
            appName && isGithubAppConfigured()
              ? `https://github.com/apps/${appName}/installations/new`
              : null,
        };
      } catch {
        return { status: "ok" as const };
      }
    }),
});
