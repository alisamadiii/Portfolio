import { TRPCError } from "@trpc/server";
import z from "zod";

import { cmsProcedure, createTRPCRouter } from "../../init";
import { inspectSite } from "../../lib/inspect";
import { getPreviewSession } from "../../lib/content-pilot";
import { getCustomDomainBaseUrl } from "./pages";

/**
 * Per-page SEO inspection for the canvas. Reuses the leads Site Inspector lib
 * (`inspectSite`), scoped to the project: the caller supplies only a path, and
 * the host is resolved server-side — so it can never be pointed at an arbitrary
 * URL, and any project collaborator (not just admins) can run it.
 *
 * Prefers the live-preview session's dev server so the client sees the SEO of
 * their in-progress (unpublished) edits. Falls back to the published domain
 * when no preview is running.
 */
export const seoRouter = createTRPCRouter({
  /** Inspects the SEO head of one page — the preview branch if a session is up. */
  inspectPage: cmsProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ ctx, input }) => {
      // Preview origin (the session dev server) if one is ready — that reflects
      // the client's unpublished edits. Best-effort: a content-pilot outage
      // just drops us to the published site.
      let base: string | null = null;
      try {
        const session = await getPreviewSession(ctx.repoId);
        if (session?.status === "ready" && session.previewUrl) {
          base = new URL(session.previewUrl).origin;
        }
      } catch {
        // no preview — fall through to the published domain
      }

      // Fallback: the project's published domain.
      if (!base) base = await getCustomDomainBaseUrl(ctx.repoId);
      if (!base) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Start a preview or add a website URL in Settings › Domain first.",
        });
      }

      const target = new URL(input.path || "/", base).href;
      return inspectSite(target, { keepPath: true });
    }),
});
