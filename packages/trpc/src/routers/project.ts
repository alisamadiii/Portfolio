import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";
import z from "zod";

import { cmsFullAccessProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubDomain, hubProject } from "@workspace/drizzle/schema";

import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { deleteProjectChildRows } from "@workspace/trpc/lib/cms/org-repos";
import { resolveRepoId } from "@workspace/trpc/lib/cms/repo-id";
import { settleAndCancel } from "@workspace/trpc/lib/cms/settle-subscription";
import {
  deleteWorkerScript,
  detachWorkerDomain,
} from "@workspace/trpc/routers/integrations/cloudflare";
import { resolveProjectCf } from "@workspace/trpc/routers/domain";

export const projectRouter = createTRPCRouter({
  /**
   * Delete everything about a project: cancel + prorate-refund its paid Stripe
   * subscription (hard gate), tear down its own Cloudflare resources (custom
   * domains + Worker — nothing else in the zone), wipe every project-scoped
   * row, and tombstone the hub_project row so an org re-sync can't resurrect it.
   *
   * Never touches the GitHub repo, the user's integration tokens, usesend/email
   * resources, or any Cloudflare resource we didn't create.
   */
  delete: cmsFullAccessProcedure.mutation(async ({ ctx, input }) => {
    try {
      const repoId = await resolveRepoId(input.owner, input.repo);

      // 1. Billing first — hard gate. A failed cancel/refund aborts the delete.
      await settleAndCancel(repoId);

      // 2. Cloudflare teardown — best-effort, scoped to this project only.
      const cf = await resolveProjectCf(input.owner, input.repo, ctx.user.id);
      if (cf) {
        const domains = await db
          .select({ cfDomainId: hubDomain.cfDomainId })
          .from(hubDomain)
          .where(
            and(eq(hubDomain.repoId, repoId), isNotNull(hubDomain.cfDomainId))
          );
        for (const d of domains) {
          if (!d.cfDomainId) continue;
          try {
            await detachWorkerDomain(cf.token, cf.accountId, d.cfDomainId);
          } catch {
            // Leave the custom domain on CF if detach fails; row is wiped below.
          }
        }
        if (cf.workerName) {
          try {
            await deleteWorkerScript(cf.token, cf.accountId, cf.workerName);
          } catch {
            // Worker may already be gone / never deployed — not fatal.
          }
        }
      }

      // 3. Wipe project-scoped rows (domains, deployments, blog, subscription,
      //    collaborators), then tombstone the project + clear its CF fields.
      await deleteProjectChildRows([repoId]);
      await db
        .update(hubProject)
        .set({
          hidden: true,
          cfConnectedUserId: null,
          cfAccountId: null,
          cfZoneId: null,
          cfPagesProject: null,
          cfPagesSubdomain: null,
          cfPreviewUrl: null,
          cfRootDir: null,
        })
        .where(eq(hubProject.repoId, repoId));

      return { ok: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),
});
