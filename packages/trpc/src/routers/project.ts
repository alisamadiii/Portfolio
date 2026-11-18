import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  cmsFullAccessProcedure,
  collaboratorManageProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { agencyClient, hubProject } from "@workspace/drizzle/schema";

import { APP_IDS, planAllowsApp, type AppId } from "@workspace/trpc/lib/apps";
import { getEntitlement } from "@workspace/trpc/lib/payment/entitlements";
import { isAdminUser } from "@workspace/trpc/lib/authz-shared";
import { assertProjectOwnerOrAdmin } from "@workspace/trpc/lib/cms/authz";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { deleteImport } from "@workspace/trpc/lib/content-pilot";
import {
  archiveBackupRepo,
  hasWebsiteSetup,
  linkBackupRepo,
  linkedBackupRepo,
  listBackupRepos,
  sourceCodeZipUrl,
  sourceFile,
  sourceTree,
} from "@workspace/trpc/lib/github-backup";
import { normalizeWebsiteUrl } from "@workspace/trpc/lib/website-url";
import { deleteProjectChildRows } from "@workspace/trpc/lib/cms/org-repos";
import { deleteProjectLogos } from "@workspace/trpc/lib/logo";
import { settleAndCancel } from "@workspace/trpc/lib/payment/settle-subscription";

import { projectBusinessRouter } from "./project-business";

/** Apps whose data lives on the project's agency_client row. */
const AGENCY_APPS: readonly AppId[] = ["leads", "google-ads"];

export const projectRouter = createTRPCRouter({
  // Business details (name, phone, address, hours, Google listing).
  business: projectBusinessRouter,

  /**
   * Delete everything about a project — both its data and its external
   * resources — and remove its hub_project row. Runs the same for GitHub and
   * uploaded projects.
   *
   * Order is chosen so a mid-sequence failure leaves a retryable state (every
   * later step is idempotent): billing settles first as a hard gate, then the
   * pilot teardown (which auto-closes any live session), then the
   * hub-DB rows, then the project row. There is no cross-system transaction, so
   * retrying a half-finished delete converges.
   *
   * Never touches the GitHub repo itself or the user's shared Stripe customer.
   */
  delete: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    // Cancels and refunds the owner's subscription: owner or admin only.
    await assertProjectOwnerOrAdmin(ctx.session.user, ctx.projectId);
    try {
      const projectId = ctx.projectId;

      const [project] = await db
        .select({
          owner: hubProject.owner,
          repo: hubProject.repo,
        })
        .from(hubProject)
        .where(eq(hubProject.id, projectId))
        .limit(1);
      if (!project) return { ok: true };

      // 1. Billing — hard gate. A failed cancel/refund aborts before anything
      //    is destroyed, and the project survives for a retry.
      await settleAndCancel(projectId);

      // 2. content-pilot teardown (any source): workspace clone, every preview
      //    session (+ transcripts/events/attachments/
      //    staged uploads), and the per-repo setting overrides. Auto-closes a
      //    live editing session, so this never 409s.
      await deleteImport(projectId);
      // Upload projects: archive (never delete) the backup-org repo. Best effort.
      await archiveBackupRepo(projectId);

      // 3. Wipe project-scoped hub rows (subscription, collaborators, invites,
      //    config + content cache).
      await deleteProjectChildRows([
        { projectId, owner: project.owner, repo: project.repo },
      ]);
      // Business logo objects in R2 (best effort, never blocks the delete).
      await deleteProjectLogos(projectId);

      // 4. Remove the project row from our database (GitHub and uploaded
      //    alike; the GitHub repo itself is never touched). Nothing re-adds
      //    projects automatically (only an explicit import inserts), so no
      //    tombstone is needed, and the name is free for a re-import.
      await db.delete(hubProject).where(eq(hubProject.id, projectId));

      return { ok: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /**
   * The client's live website (hosted on their own Netlify etc.). Feeds speed
   * reports, campaign URLs, the SEO base URL and the embed-script origin
   * auto-allow. Project owner or admin; null clears it.
   */
  /**
   * Replace the set of apps shown for a project (Apps page "Add" / "Remove").
   * DB-only access check (admins + full-access collaborators) on purpose: the
   * GitHub-backed procedures 412 on projects without the App installed, and
   * adding an app must never depend on GitHub.
   */
  setApps: collaboratorManageProcedure
    .input(z.object({ apps: z.array(z.enum(APP_IDS)).max(APP_IDS.length) }))
    .mutation(async ({ ctx, input }) => {
      const apps = [...new Set(input.apps)];
      // Adding needs a paid plan that covers the app, for everyone (admins
      // included). Removing, or keeping what's installed, is always allowed.
      const [current] = await db
        .select({ apps: hubProject.apps })
        .from(hubProject)
        .where(eq(hubProject.id, input.projectId))
        .limit(1);
      const added = apps.filter((id) => !(current?.apps ?? []).includes(id));
      if (added.length) {
        const entitlement = await getEntitlement(input.projectId);
        const blocked = added.filter((id) => !planAllowsApp(id, entitlement));
        if (blocked.length) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apps need a monthly plan. Contact us to set one up.",
          });
        }
      }
      try {
        const [project] = await db
          .update(hubProject)
          .set({ apps })
          .where(eq(hubProject.id, input.projectId))
          .returning({ ownerId: hubProject.githubConnectedUserId });
        // Leads and Google Ads keep their data on the project's agency row:
        // adding either creates it (idempotent), owned by whoever imported
        // the project. Reading the data still needs the agency plan.
        // No owner: only an admin may become it, never a collaborator.
        const agencyOwner =
          project?.ownerId ??
          (isAdminUser(ctx.session.user) ? ctx.session.user.id : null);
        if (agencyOwner && apps.some((id) => AGENCY_APPS.includes(id))) {
          await db
            .insert(agencyClient)
            .values({
              userId: agencyOwner,
              projectId: input.projectId,
            })
            .onConflictDoNothing({ target: agencyClient.projectId });
        }
      } catch (error) {
        throw toTRPCError(error);
      }
      return { apps };
    }),

  setWebsiteUrl: cmsFullAccessProcedure
    .input(z.object({ websiteUrl: z.string().trim().max(255).nullable() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [project] = await db
          .select({ ownerId: hubProject.githubConnectedUserId })
          .from(hubProject)
          .where(eq(hubProject.id, ctx.projectId))
          .limit(1);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        }
        // The project owner (who imported it) or an admin; collaborators can't.
        if (!isAdminUser(ctx.user) && project.ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only the project owner or an admin can change the website URL.",
          });
        }

        let websiteUrl: string | null = null;
        if (input.websiteUrl) {
          websiteUrl = normalizeWebsiteUrl(input.websiteUrl);
          if (!websiteUrl) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Enter the live website, e.g. www.example.com",
            });
          }
        }

        await db
          .update(hubProject)
          .set({ websiteUrl })
          .where(eq(hubProject.id, ctx.projectId));
        return { websiteUrl };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /** Source Code download: upload projects whose client paid Website Setup (admins always). */
  sourceCode: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => ({
      available: await canDownloadSource(ctx.session.user, input.projectId),
    })),

  /** Source Code page: the linked backup repo (null = not linked yet). */
  sourceCodeRepo: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!(await canDownloadSource(ctx.session.user, input.projectId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Source code comes with the Website Setup plan." });
      }
      return {
        repo: await linkedBackupRepo(input.projectId),
        canLink: isAdminUser(ctx.session.user),
      };
    }),

  /** Admin: every repo in the backup org, to link one to a project. */
  backupRepos: adminProcedure.query(() => listBackupRepos()),

  linkBackupRepo: adminProcedure
    .input(z.object({ projectId: z.string().uuid(), repoId: z.number().int().positive() }))
    .mutation(({ input }) => linkBackupRepo(input.projectId, input.repoId)),

  downloadSourceCode: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!(await canDownloadSource(ctx.session.user, input.projectId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Source code comes with the Website Setup plan." });
      }
      return { url: await sourceCodeZipUrl(input.projectId) };
    }),

  /** Code browser: every path in the backup repo. */
  sourceTree: authenticatedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!(await canDownloadSource(ctx.session.user, input.projectId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Source code comes with the Website Setup plan." });
      }
      return sourceTree(input.projectId);
    }),

  /** Code browser: one file's contents (path only picks the image type). */
  sourceFile: authenticatedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        sha: z.string().regex(/^[0-9a-f]{40}$/),
        path: z.string().max(1024),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!(await canDownloadSource(ctx.session.user, input.projectId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Source code comes with the Website Setup plan." });
      }
      return sourceFile(input.projectId, input.sha, input.path);
    }),
});

async function canDownloadSource(user: Parameters<typeof assertProjectOwnerOrAdmin>[0], projectId: string) {
  await assertProjectOwnerOrAdmin(user, projectId);
  const [project] = await db
    .select({ source: hubProject.source })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (project?.source !== "upload") return false;
  return isAdminUser(user) || (await hasWebsiteSetup(projectId));
}
