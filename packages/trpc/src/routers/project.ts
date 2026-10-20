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
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { deleteImport } from "@workspace/trpc/lib/content-pilot";
import { deleteProjectChildRows } from "@workspace/trpc/lib/cms/org-repos";
import { settleAndCancel } from "@workspace/trpc/lib/cms/settle-subscription";
import { deleteUsesendDomain } from "@workspace/trpc/lib/usesend";

export const projectRouter = createTRPCRouter({
  /**
   * Delete everything about a project — both its data and its external
   * resources — and tombstone the hub_project row so a re-sync can't resurrect
   * it. Runs the same for GitHub and uploaded projects.
   *
   * Order is chosen so a mid-sequence failure leaves a retryable state (every
   * later step is idempotent): billing settles first as a hard gate, then the
   * external resources (Cloudflare custom hostname, useSend sending domain),
   * then the pilot teardown (which auto-closes any live session), then the
   * hub-DB rows, then the tombstone. There is no cross-system transaction, so
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
      //    never blocks the delete; on failure we KEEP customDomainCfId in the
      //    tombstone so the handle survives for a retry.
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

      // 6. Tombstone: keep the row (blocks re-create/re-sync) but clear every
      //    per-project field. customDomainCfId is kept only if its CF delete
      //    failed, so the orphan can still be cleaned later.
      await db
        .update(hubProject)
        .set({
          hidden: true,
          websiteUrl: null,
          githubConnectedUserId: null,
          freeSubdomain: null,
          customDomain: null,
          customDomainStatus: null,
          customDomainCfId: cfCleared ? null : project.customDomainCfId,
          usesendDomainId: null,
          usesendPendingDomainId: null,
          gaPropertyId: null,
          gaConnectedUserId: null,
          blogEditedAt: null,
          blogPublishedAt: null,
        })
        .where(eq(hubProject.repoId, repoId));

      return { ok: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /**
   * Set (or clear) the project's live website URL — the domain shown across the
   * hub and used as the canvas/SEO base URL. Accepts a bare host or a full URL;
   * stores the normalized origin (https://). Empty clears it.
   */
  setWebsiteUrl: cmsFullAccessProcedure
    .input(z.object({ websiteUrl: z.string().trim().max(255) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const repoId = ctx.repoId;
        const raw = input.websiteUrl.trim();
        let url: string | null = null;
        if (raw) {
          const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
          try {
            url = new URL(withProto).origin;
          } catch {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Enter a valid domain, e.g. example.com",
            });
          }
        }
        await db
          .update(hubProject)
          .set({ websiteUrl: url })
          .where(eq(hubProject.repoId, repoId));
        return { websiteUrl: url };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
