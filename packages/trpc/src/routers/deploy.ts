import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { githubInstallation, hubProject } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { isAdminUser } from "../lib/authz-shared";
import { signImportToken } from "../lib/cms/edit-token";
import { syntheticRepoId, uploadSlug } from "../lib/cms/upload-slug";
import { getImport } from "../lib/content-pilot";
import { isUniqueViolation } from "../lib/db-errors";
import { checkGithubRepoFramework } from "../lib/detect-framework";
import {
  HOSTING_VALUES,
  type Hosting,
  isExternalHosting,
  normalizeWebsiteUrl,
} from "../lib/hosting";
import { createOctokitInstance } from "../lib/cms/octokit";
import {
  appJwt,
  installationForRepo,
  isGithubAppConfigured,
  mintInstallationToken,
} from "../lib/github-app";
import { getConnectedAccount } from "../lib/integrations";

// ─── Deploy / import flow ────────────────────────────────────────
// "Add project": pick a GitHub repo + enter its live website URL (used for the
// iframe preview + as the project's website_url). Every project is repo-keyed
// (hub_project.repoId). The importing user's id is stored as
// githubConnectedUserId — that user owns the project.
//
// The only import source is a GitHub App installation ("Ali Samadi App"): the
// repo owner installs the app, installation tokens power every read/commit,
// and nobody's personal GitHub token is involved.

const splitRepo = (fullName: string) => {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid repository." });
  }
  return { owner, repo };
};

/**
 * Create or attach the hub_project for an imported repo. Upserts by repoId so
 * existing rows are reused; sets the project's website_url when provided.
 */
async function upsertProject(
  userId: string,
  ghRepo: {
    id: number;
    owner: string;
    repo: string;
    private: boolean;
    defaultBranch: string;
    updatedAt: string | null;
  },
  websiteUrl?: string | null,
  hosting?: Hosting
) {
  const [existing] = await db
    .select({
      owner: hubProject.owner,
      repo: hubProject.repo,
      githubConnectedUserId: hubProject.githubConnectedUserId,
    })
    .from(hubProject)
    .where(eq(hubProject.repoId, ghRepo.id))
    .limit(1);
  // Never let a re-import reassign a project that another user already owns.
  if (
    existing?.githubConnectedUserId &&
    existing.githubConnectedUserId !== userId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${existing.owner}/${existing.repo} is already owned by another user.`,
    });
  }
  const fields = {
    // The importing user owns this project (access filtering + full-access role).
    githubConnectedUserId: userId,
    // Re-importing a deleted project revives its tombstoned row — without this
    // the project stays invisible (every listing and getToken filter hidden).
    hidden: false,
    ...(websiteUrl ? { websiteUrl } : {}),
    ...(hosting ? { hosting } : {}),
  };
  if (existing) {
    await db
      .update(hubProject)
      .set({
        ...fields,
        // Identity is repoId; owner/repo are display-only. Refresh them from the
        // live GitHub metadata so a rename/transfer keeps the label honest.
        owner: ghRepo.owner,
        repo: ghRepo.repo,
        private: ghRepo.private,
        defaultBranch: ghRepo.defaultBranch,
        githubUpdatedAt: new Date(ghRepo.updatedAt ?? Date.now()),
      })
      .where(eq(hubProject.repoId, ghRepo.id));
  } else {
    await db.insert(hubProject).values({
      repoId: ghRepo.id,
      owner: ghRepo.owner,
      repo: ghRepo.repo,
      private: ghRepo.private,
      defaultBranch: ghRepo.defaultBranch,
      githubUpdatedAt: new Date(ghRepo.updatedAt ?? Date.now()),
      syncedAt: new Date(),
      ...fields,
    });
  }
}

const ghAppHeaders = (auth: string) => ({
  authorization: `Bearer ${auth}`,
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
});

type InstallationMeta = {
  installationId: number;
  accountLogin: string;
  accountId: number;
  accountType: string;
  repositorySelection: string;
  suspended: boolean;
};

/** Live installation metadata from GitHub (also the webhook-miss backfill). */
async function fetchInstallation(
  installationId: number
): Promise<InstallationMeta | null> {
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}`,
    { headers: ghAppHeaders(appJwt()) }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    id: number;
    account?: { id: number; login: string; type?: string } | null;
    repository_selection?: string;
    suspended_at?: string | null;
  };
  if (!data.account) return null;
  return {
    installationId: data.id,
    accountLogin: data.account.login,
    accountId: data.account.id,
    accountType: data.account.type ?? "User",
    repositorySelection: data.repository_selection ?? "selected",
    suspended: !!data.suspended_at,
  };
}

/**
 * Resolve a repo via a linked installation of the caller (metadata read with
 * the installation token). Returns null when none of the caller's
 * installations covers the repo — the import then fails with an install prompt.
 */
async function resolveRepoViaInstallation(
  userId: string,
  isAdmin: boolean,
  repoFullName: string
) {
  if (!isGithubAppConfigured()) return null;
  const { owner, repo } = splitRepo(repoFullName);
  const covering = await installationForRepo(owner, repo).catch(() => null);
  if (!covering) return null;

  // Only repo admins can install a GitHub App, so coverage by an installation
  // the caller linked is a stronger grant than the OAuth push check.
  const [linked] = await db
    .select({ linkedUserId: githubInstallation.linkedUserId })
    .from(githubInstallation)
    .where(eq(githubInstallation.installationId, covering.installationId))
    .limit(1);
  if (!isAdmin && linked?.linkedUserId !== userId) return null;

  const { token } = await mintInstallationToken(covering.installationId);
  const octokit = createOctokitInstance(token);
  const { data } = await octokit.rest.repos.get({
    owner,
    repo,
  });
  return {
    octokit,
    id: data.id,
    owner: data.owner.login,
    repo: data.name,
    private: data.private,
    defaultBranch: data.default_branch,
    updatedAt: data.updated_at ?? null,
  };
}

export const deployRouter = createTRPCRouter({
  // GitHub App install entry point (null when the app isn't configured).
  appInstallUrl: authenticatedProcedure.query(async () => {
    const name = process.env.GITHUB_APP_NAME;
    if (!name || !isGithubAppConfigured()) return { url: null };
    return { url: `https://github.com/apps/${name}/installations/new` };
  }),

  /**
   * Claim an installation after GitHub's post-install redirect (the hub setup
   * page passes installation_id). The claim is authorized against GitHub, not
   * the query string: the caller's connected GitHub account must BE the
   * installation account (user install) or the user who clicked install (org
   * install, from the webhook's sender). Admins bypass.
   */
  linkInstallation: authenticatedProcedure
    .input(z.object({ installationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!isGithubAppConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The GitHub App is not configured on this server.",
        });
      }
      const meta = await fetchInstallation(input.installationId);
      if (!meta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This installation does not exist on GitHub.",
        });
      }

      // Backfill/refresh the row (covers a missed or racing webhook).
      await db
        .insert(githubInstallation)
        .values({
          installationId: meta.installationId,
          accountLogin: meta.accountLogin,
          accountId: meta.accountId,
          accountType: meta.accountType,
          repositorySelection: meta.repositorySelection,
          suspendedAt: meta.suspended ? new Date() : null,
          removedAt: null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: githubInstallation.installationId,
          set: {
            accountLogin: meta.accountLogin,
            accountId: meta.accountId,
            accountType: meta.accountType,
            repositorySelection: meta.repositorySelection,
            suspendedAt: meta.suspended ? new Date() : null,
            removedAt: null,
            updatedAt: new Date(),
          },
        });

      const user = ctx.session.user;
      if (!isAdminUser(user)) {
        const connected = await getConnectedAccount(user.id, "github");
        const [row] = await db
          .select({ senderGithubId: githubInstallation.senderGithubId })
          .from(githubInstallation)
          .where(eq(githubInstallation.installationId, meta.installationId))
          .limit(1);
        const callerGithubId = connected?.accountId;
        const allowed =
          !!callerGithubId &&
          (callerGithubId === String(meta.accountId) ||
            (row?.senderGithubId != null &&
              callerGithubId === String(row.senderGithubId)));
        if (!allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Sign in with the GitHub account that installed the app to link it.",
          });
        }
      }

      await db
        .update(githubInstallation)
        .set({ linkedUserId: user.id, updatedAt: new Date() })
        .where(eq(githubInstallation.installationId, meta.installationId));
      return { accountLogin: meta.accountLogin };
    }),

  // The caller's linked, active installations (import-source picker).
  installations: authenticatedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        installationId: githubInstallation.installationId,
        accountLogin: githubInstallation.accountLogin,
        accountType: githubInstallation.accountType,
        repositorySelection: githubInstallation.repositorySelection,
        suspendedAt: githubInstallation.suspendedAt,
      })
      .from(githubInstallation)
      .where(
        and(
          eq(githubInstallation.linkedUserId, ctx.session.user.id),
          isNull(githubInstallation.removedAt)
        )
      );
    return rows.map((row) => ({
      installationId: row.installationId,
      accountLogin: row.accountLogin,
      accountType: row.accountType,
      repositorySelection: row.repositorySelection,
      suspended: !!row.suspendedAt,
    }));
  }),

  // Repos one of the caller's installations covers (same shape as githubRepos).
  installationRepos: authenticatedProcedure
    .input(z.object({ installationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ linkedUserId: githubInstallation.linkedUserId })
        .from(githubInstallation)
        .where(eq(githubInstallation.installationId, input.installationId))
        .limit(1);
      if (
        !row ||
        (row.linkedUserId !== ctx.session.user.id &&
          !isAdminUser(ctx.session.user))
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { token } = await mintInstallationToken(input.installationId);
      const octokit = createOctokitInstance(token);
      const repos = await octokit.paginate(
        octokit.rest.apps.listReposAccessibleToInstallation,
        { per_page: 100 }
      );
      return repos
        .sort(
          (a, b) =>
            new Date(b.pushed_at ?? 0).getTime() -
            new Date(a.pushed_at ?? 0).getTime()
        )
        .map((r) => ({
          id: r.id,
          fullName: r.full_name,
          owner: r.owner.login,
          name: r.name,
          defaultBranch: r.default_branch,
          private: r.private,
          pushedAt: r.pushed_at,
        }));
    }),

  // GitHub source: link a repo. Same hosting as uploads: the pilot builds every
  // publish and serves it, so websiteUrl is the pilot live URL (domains are set
  // later in the Domain panel). Only static sites get in, checked BEFORE save.
  importGithub: authenticatedProcedure
    .input(
      z.object({
        repoFullName: z.string().min(1),
        // The live site stays on another host (push-only publish).
        hosting: z.enum(HOSTING_VALUES).optional(),
        websiteUrl: z.string().trim().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Only an installation the caller linked grants the import — installing
      // a GitHub App requires repo admin, so coverage is the ownership proof.
      const ghRepo = await resolveRepoViaInstallation(
        userId,
        isAdminUser(ctx.session.user),
        input.repoFullName
      );
      if (!ghRepo) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Install the GitHub App on this repository (and link the installation) to import it.",
        });
      }
      const check = await checkGithubRepoFramework(ghRepo.octokit, {
        owner: ghRepo.owner,
        repo: ghRepo.repo,
        ref: ghRepo.defaultBranch,
      });
      if (!check.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: check.message });
      }
      // The importer becomes the project owner, so they choose the hosting.
      const hosting = input.hosting ?? "content-pilot";
      let websiteUrl: string | null;
      if (isExternalHosting(hosting)) {
        websiteUrl = normalizeWebsiteUrl(input.websiteUrl ?? "");
        if (!websiteUrl) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter the live website, e.g. www.example.com",
          });
        }
      } else {
        websiteUrl =
          (await getImport(ghRepo.id).catch(() => null))?.liveUrl ?? null;
      }
      await upsertProject(userId, ghRepo, websiteUrl, hosting);
      return { repo: ghRepo.repo, repoId: ghRepo.id };
    }),

  // ─── Upload source (no GitHub) ────────────────────────────────────
  // Netlify-style import: the user drops a folder or zip; the browser uploads
  // it STRAIGHT to content-pilot (Vercel body caps rule out proxying) with a
  // one-time import token minted here. The row starts hidden and is revealed
  // by finalizeUpload once the workspace verifiably exists on the pilot.

  // Step 1: reserve the project row (hidden) + mint the one-time import token.
  importUpload: authenticatedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const secret = process.env.EDIT_TOKEN_SECRET;
      if (!secret) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Uploads are not configured on this server.",
        });
      }
      const userId = ctx.session.user.id;
      const base = uploadSlug(input.name);

      // Uniquify against uq_hub_project_owner_repo_ci under the 'uploads'
      // pseudo-owner, then insert with a synthetic repoId. Retried on the rare
      // id collision (uq_hub_project_repo_id).
      for (let attempt = 0; attempt < 5; attempt++) {
        const repo = attempt === 0 ? base : `${base}-${attempt + 1}`;
        const repoId = syntheticRepoId();
        // A deleted upload project left before hard deletes existed still
        // holds its name as a tombstone (hidden, no owner). Uploads never
        // re-sync, so reclaim the name. A reserved in-progress import is also
        // hidden but keeps its owner, so it's never touched.
        await db
          .delete(hubProject)
          .where(
            and(
              eq(hubProject.source, "upload"),
              eq(hubProject.owner, "uploads"),
              sql`lower(${hubProject.repo}) = lower(${repo})`,
              eq(hubProject.hidden, true),
              isNull(hubProject.githubConnectedUserId),
              isNull(hubProject.customDomainCfId)
            )
          );
        try {
          await db.insert(hubProject).values({
            repoId,
            source: "upload",
            owner: "uploads",
            repo,
            private: true,
            defaultBranch: "main",
            githubUpdatedAt: new Date(),
            syncedAt: new Date(),
            githubConnectedUserId: userId,
            hidden: true,
          });
          return {
            repoId,
            name: repo,
            importToken: signImportToken({ repoId }, secret),
          };
        } catch (error) {
          // Unique violation on owner/repo or repoId — try the next suffix/id.
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new TRPCError({
        code: "CONFLICT",
        message: "Could not reserve a project name. Try a different name.",
      });
    }),

  // Step 2 (after the browser's zip upload): verify the workspace landed on
  // content-pilot, then reveal the row and store the live URL.
  finalizeUpload: authenticatedProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireOwnUploadRow(ctx.session.user, input.repoId);
      const status = await getImport(input.repoId);
      if (!status.exists) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The upload did not reach the preview server. Try again.",
        });
      }
      await db
        .update(hubProject)
        .set({
          hidden: false,
          websiteUrl: status.liveUrl ?? null,
          githubUpdatedAt: new Date(),
          syncedAt: new Date(),
        })
        .where(eq(hubProject.repoId, input.repoId));
      return { repoId: input.repoId, name: project.repo };
    }),

  // Error path: drop a reserved-but-never-finalized row so the name frees up.
  cancelUpload: authenticatedProcedure
    .input(z.object({ repoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnUploadRow(ctx.session.user, input.repoId);
      // Hard-delete only hidden rows — a visible project goes through
      // project.delete (billing settle + pilot cleanup).
      await db
        .delete(hubProject)
        .where(
          and(
            eq(hubProject.repoId, input.repoId),
            eq(hubProject.source, "upload"),
            eq(hubProject.hidden, true)
          )
        );
      return { ok: true };
    }),
});

/** The caller's own upload-sourced row (admins pass), or a clear error. */
async function requireOwnUploadRow(
  user: { id: string; email: string; role?: string | null },
  repoId: number
) {
  const [project] = await db
    .select({
      repo: hubProject.repo,
      source: hubProject.source,
      githubConnectedUserId: hubProject.githubConnectedUserId,
    })
    .from(hubProject)
    .where(eq(hubProject.repoId, repoId))
    .limit(1);
  if (!project || project.source !== "upload") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found." });
  }
  if (!isAdminUser(user) && project.githubConnectedUserId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your upload." });
  }
  return project;
}
