import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { cmsFullAccessProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { deleteProjectChildRows } from "@workspace/trpc/lib/cms/org-repos";
import { resolveRepoId } from "@workspace/trpc/lib/cms/repo-id";
import { settleAndCancel } from "@workspace/trpc/lib/cms/settle-subscription";

export const projectRouter = createTRPCRouter({
  /**
   * Delete everything about a project: cancel + prorate-refund its paid Stripe
   * subscription (hard gate), wipe every project-scoped row, and tombstone the
   * hub_project row so an org re-sync can't resurrect it.
   *
   * Never touches the GitHub repo, the user's integration tokens, or
   * usesend/email resources.
   */
  delete: cmsFullAccessProcedure.mutation(async ({ ctx, input }) => {
    try {
      const repoId = await resolveRepoId(input.owner, input.repo);

      // 1. Billing first — hard gate. A failed cancel/refund aborts the delete.
      await settleAndCancel(repoId);

      // 2. Wipe project-scoped rows (blog, subscription, collaborators), then
      //    tombstone the project + clear its GitHub fields.
      await deleteProjectChildRows([repoId]);
      await db
        .update(hubProject)
        .set({
          hidden: true,
          websiteUrl: null,
          githubConnectedUserId: null,
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
    .mutation(async ({ input }) => {
      try {
        const repoId = await resolveRepoId(input.owner, input.repo);
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
