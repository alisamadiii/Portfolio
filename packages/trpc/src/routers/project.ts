import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { cmsFullAccessProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  deleteCustomHostname,
  isCloudflareSaasConfigured,
} from "@workspace/trpc/lib/cloudflare-saas";
import { isAdminUser } from "@workspace/trpc/lib/authz-shared";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { deleteImport, getImport } from "@workspace/trpc/lib/content-pilot";
import {
  HOSTING_VALUES,
  isExternalHosting,
  normalizeWebsiteUrl,
} from "@workspace/trpc/lib/hosting";
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
   * external resources (Cloudflare custom hostname, useSend sending domain),
   * then the pilot teardown (which auto-closes any live session), then the
   * hub-DB rows, then the project row. There is no cross-system transaction, so
   * retrying a half-finished delete converges.
   *
   * Never touches the GitHub repo itself or the user's shared Stripe customer.
   */
  delete: cmsFullAccessProcedure.mutation(async ({ ctx }) => {
    try {
      const repoId = ctx.repoId;

      const [project] = await db
        .select({
          owner: hubProject.owner,
          repo: hubProject.repo,
          customDomainCfId: hubProject.customDomainCfId,
          usesendDomainId: hubProject.usesendDomainId,
          usesendPendingDomainId: hubProject.usesendPendingDomainId,
        })
        .from(hubProject)
        .where(eq(hubProject.repoId, repoId))
        .limit(1);
      if (!project) return { ok: true };

      // 1. Billing — hard gate. A failed cancel/refund aborts before anything
      //    is destroyed, and the project survives for a retry.
      await settleAndCancel(repoId);

      // 2. Cloudflare custom hostname (any source). Best-effort so a CF blip
      //    never blocks the delete; on failure we KEEP customDomainCfId in a
      //    hidden tombstone so the handle survives for a retry.
      let cfCleared = true;
      if (project.customDomainCfId && isCloudflareSaasConfigured()) {
        try {
          await deleteCustomHostname(project.customDomainCfId);
        } catch (error) {
          cfCleared = false;
          console.error("[project.delete] cf hostname delete failed", error);
        }
      }

      // 3. useSend sending domain (active or still-pending). 404-tolerant;
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

      // 4. content-pilot teardown (any source): workspace clone, live snapshot,
      //    domain map, every preview session (+ transcripts/events/attachments/
      //    staged uploads), and the per-repo setting overrides. Auto-closes a
      //    live editing session, so this never 409s.
      await deleteImport(repoId);

      // 5. Wipe project-scoped hub rows (subscription, collaborators, invites,
      //    config + content cache).
      await deleteProjectChildRows([
        { repoId, owner: project.owner, repo: project.repo },
      ]);

      // 6. Remove the project row from our database (GitHub and uploaded
      //    alike; the GitHub repo itself is never touched). Nothing re-adds
      //    projects automatically (only an explicit import inserts), so no
      //    tombstone is needed, and the name is free for a re-import. The one
      //    exception: a failed Cloudflare hostname delete keeps a hidden
      //    tombstone holding customDomainCfId, so the orphan can be cleaned.
      if (cfCleared) {
        await db.delete(hubProject).where(eq(hubProject.repoId, repoId));
      } else {
        await db
          .update(hubProject)
          .set({
            hidden: true,
            websiteUrl: null,
            githubConnectedUserId: null,
            freeSubdomain: null,
            customDomain: null,
            customDomainStatus: null,
            usesendDomainId: null,
            usesendPendingDomainId: null,
            gaPropertyId: null,
            gaConnectedUserId: null,
            blogEditedAt: null,
            blogPublishedAt: null,
          })
          .where(eq(hubProject.repoId, repoId));
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /**
   * Where the live website is served (project owner or admin). External hosting (Netlify,
   * Vercel, Cloudflare, other) = publish only pushes to GitHub and that host
   * deploys; the website URL points at the client's own site. Back to Content
   * Pilot = the next publish builds and serves it here again.
   */
  setHosting: cmsFullAccessProcedure
    .input(
      z.object({
        hosting: z.enum(HOSTING_VALUES),
        websiteUrl: z.string().trim().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [project] = await db
          .select({
            source: hubProject.source,
            ownerId: hubProject.githubConnectedUserId,
          })
          .from(hubProject)
          .where(eq(hubProject.repoId, ctx.repoId))
          .limit(1);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        }
        // The project owner (who imported it) or an admin; collaborators can't.
        if (!isAdminUser(ctx.user) && project.ownerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only the project owner or an admin can change where a site is hosted.",
          });
        }

        let websiteUrl: string | null;
        if (isExternalHosting(input.hosting)) {
          if (project.source !== "github") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Uploaded projects are always hosted on Content Pilot. Import from GitHub to host elsewhere.",
            });
          }
          websiteUrl = normalizeWebsiteUrl(input.websiteUrl ?? "");
          if (!websiteUrl) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Enter the live website, e.g. www.example.com",
            });
          }
        } else {
          websiteUrl =
            (await getImport(ctx.repoId).catch(() => null))?.liveUrl ?? null;
        }

        await db
          .update(hubProject)
          .set({ hosting: input.hosting, websiteUrl })
          .where(eq(hubProject.repoId, ctx.repoId));
        return { hosting: input.hosting, websiteUrl };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
