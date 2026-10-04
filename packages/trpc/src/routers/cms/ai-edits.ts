import { TRPCError } from "@trpc/server";

import { cmsProcedure, createTRPCRouter } from "../../init";
import { roleAtLeast } from "../../lib/authz-shared";
import { signEditToken } from "@workspace/trpc/lib/cms/edit-token";
import { requireProjectPlan } from "@workspace/trpc/lib/cms/feature-access";

export const aiEditsRouter = createTRPCRouter({
  /**
   * Mints a short-lived, repo-scoped token for the canvas editor iframe. The
   * overlay sends it to the content-pilot intake as a Bearer, so the long-lived
   * content-pilot API key never reaches the browser. Access is gated by
   * `cmsProcedure` (the caller must already have CMS access to owner/repo).
   */
  mintEditToken: cmsProcedure.query(async ({ ctx }) => {
    // Request-a-change is an edit action — view-only collaborators can't mint.
    if (!roleAtLeast(ctx.role, "content-editor")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "View-only access." });
    }
    // AI chat is a paid feature: messages go straight to content-pilot with
    // this token, so gating the mint blocks chat server-side.
    await requireProjectPlan(ctx.user, ctx.repoId, {
      owner: ctx.owner,
      repo: ctx.repo,
    });
    const secret = process.env.EDIT_TOKEN_SECRET;
    if (!secret) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Edit tokens are not configured on this server.",
      });
    }

    const token = signEditToken({ repoId: ctx.repoId }, secret);
    return { token };
  }),
});
