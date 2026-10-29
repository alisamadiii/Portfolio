import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { cmsFullAccessProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { isAdminUser } from "@workspace/trpc/lib/authz-shared";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { deleteImport } from "@workspace/trpc/lib/content-pilot";
import { normalizeWebsiteUrl } from "@workspace/trpc/lib/website-url";
import { deleteProjectChildRows } from "@workspace/trpc/lib/cms/org-repos";
import { settleAndCancel } from "@workspace/trpc/lib/payment/settle-subscription";
import { deleteUsesendDomain } from "@workspace/trpc/lib/usesend";

export const projectRouter = createTRPCRouter({
  /**
   * Delete everything about a project — both its data and its external
   * resources — and remove its hub_project row. Runs the same for GitHub and
   * uploaded projects.
   *
   * Order is chosen so a mid-sequence failure leaves a retryable state (every
   * later step is idempotent): billing settles first as a hard gate, then the
   * external resources (useSend sending domain),
   * then the pilot teardown (which auto-closes any live session), then the
   * hub-DB rows, then the project row. There is no cross-system transaction, so
   * retrying a half-finished delete converges.
   *
   * Never touches the GitHub repo itself or the user's shared Stripe customer.
   */
  delete: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    try {
      const projectId = ctx.projectId;

      const [project] = await db
        .select({
          owner: hubProject.owner,
          repo: hubProject.repo,
          usesendDomainId: hubProject.usesendDomainId,
          usesendPendingDomainId: hubProject.usesendPendingDomainId,
        })
        .from(hubProject)
        .where(eq(hubProject.id, projectId))
        .limit(1);
      if (!project) return { ok: true };

      // 1. Billing — hard gate. A failed cancel/refund aborts before anything
      //    is destroyed, and the project survives for a retry.
      await settleAndCancel(projectId);

      // 2. useSend sending domain (active or still-pending). 404-tolerant;
      //    best-effort so an email-service blip never blocks the delete.
      for (const id of [
        project.usesendDomainId,
        project.usesendPendingDomainId,
      ]) {
        if (id != null) {
          await deleteUsesendDomain(Number(id)).catch((error) =>
            console.error("[project.delete] usesend domain delete failed", error)
          );
        }
      }

      // 3. content-pilot teardown (any source): workspace clone, every preview
      //    session (+ transcripts/events/attachments/
      //    staged uploads), and the per-repo setting overrides. Auto-closes a
      //    live editing session, so this never 409s.
      await deleteImport(projectId);

      // 4. Wipe project-scoped hub rows (subscription, collaborators, invites,
      //    config + content cache).
      await deleteProjectChildRows([
        { projectId, owner: project.owner, repo: project.repo },
      ]);

      // 5. Remove the project row from our database (GitHub and uploaded
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
});
