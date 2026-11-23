import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { hubProject } from "@workspace/drizzle/schema";

import { cmsProcedure, createTRPCRouter } from "../init";
import { createFlowsEmbed, type FlowsRole } from "../lib/flows";
import { rateLimit } from "../middleware/rate-limit";

// Automations page: Flows embedded in an iframe. The project comes from the
// cms procedure (the caller must be a collaborator), never from the browser
// alone, and the caller's hub role carries over (view-only = read-only).

export const automationsRouter = createTRPCRouter({
  /** A fresh one-time /iframe link for this project (valid 60s, single use). */
  embedUrl: cmsProcedure.mutation(async ({ ctx }) => {
    await rateLimit(30, 60_000, `automations-embed:${ctx.user.id}`);
    const project = await db.query.hubProject.findFirst({
      where: eq(hubProject.id, ctx.projectId),
      columns: { name: true, repo: true, websiteUrl: true },
    });
    const projectName = project?.name?.trim() || project?.repo || project?.websiteUrl || "Project";
    return createFlowsEmbed({
      projectId: ctx.projectId,
      projectName,
      user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
      role: (ctx.role ?? "view-only") as FlowsRole,
    });
  }),
});
