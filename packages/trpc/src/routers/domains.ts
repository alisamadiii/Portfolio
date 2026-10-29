import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { cmsFullAccessProcedure, createTRPCRouter } from "../init";
import { normalizeOrigin } from "../lib/agency/origins";

/**
 * Allowed domains for a project's embed scripts. Live sites are hosted
 * elsewhere (the client's own Netlify); the hub only previews and publishes.
 */

const projectOrigins = async (projectId: string) => {
  const [project] = await db
    .select({ origins: hubProject.origins })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  return project.origins ?? [];
};

export const domainsRouter = createTRPCRouter({
  /** Hostnames the project's embed scripts (lead form / booking / contact) may run on. */
  origins: createTRPCRouter({
    get: cmsFullAccessProcedure.query(({ ctx }) => projectOrigins(ctx.projectId)),
    set: cmsFullAccessProcedure
      .input(z.object({ origins: z.array(z.string().trim().max(253)).max(50) }))
      .mutation(async ({ ctx, input }) => {
        // Store bare hostnames, deduped; drop anything without a host.
        const cleaned = [
          ...new Set(
            input.origins
              .map((o) => normalizeOrigin(o))
              .filter((h): h is string => Boolean(h))
          ),
        ];
        await db
          .update(hubProject)
          .set({ origins: cleaned })
          .where(eq(hubProject.id, ctx.projectId));
        return cleaned;
      }),
  }),
});
