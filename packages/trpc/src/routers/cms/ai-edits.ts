import { TRPCError } from "@trpc/server";
import { and, sql } from "drizzle-orm";

import { cmsProcedure, createTRPCRouter } from "../../init";
import { roleAtLeast } from "../../lib/authz-shared";
import { signEditToken } from "@workspace/trpc/lib/cms/edit-token";
import { resolveRepoId } from "@workspace/trpc/lib/cms/repo-id";
import { listEditJobs } from "@workspace/trpc/lib/content-pilot";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

export const aiEditsRouter = createTRPCRouter({
  /**
   * Mints a short-lived, repo-scoped token for the canvas editor iframe. The
   * overlay sends it to the content-pilot intake as a Bearer, so the long-lived
   * content-pilot API key never reaches the browser. Access is gated by
   * `cmsProcedure` (the caller must already have CMS access to owner/repo).
   */
  mintEditToken: cmsProcedure.query(async ({ ctx, input }) => {
    // Request-a-change is an edit action — view-only collaborators can't mint.
    if (!roleAtLeast(ctx.role, "content-editor")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "View-only access." });
    }
    const secret = process.env.EDIT_TOKEN_SECRET;
    if (!secret) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Edit tokens are not configured on this server.",
      });
    }

    const [project] = await db
      .select({
        repoId: hubProject.repoId,
        owner: hubProject.owner,
        repo: hubProject.repo,
      })
      .from(hubProject)
      .where(
        and(
          sql`lower(${hubProject.owner}) = lower(${input.owner})`,
          sql`lower(${hubProject.repo}) = lower(${input.repo})`
        )
      )
      .limit(1);
    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    const token = signEditToken(
      { repoId: project.repoId, owner: project.owner, repo: project.repo },
      secret
    );
    return { token };
  }),

  /**
   * Lists this repo's AI edit jobs from content-pilot (the "Deployments" view).
   * Access is gated by `cmsProcedure`; the content-pilot key stays server-side.
   */
  listJobs: cmsProcedure.query(async ({ input }) => {
    const repoId = await resolveRepoId(input.owner, input.repo);
    return listEditJobs(repoId);
  }),
});
