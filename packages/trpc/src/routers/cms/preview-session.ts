import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import z from "zod";

import {
  cmsFullAccessProcedure,
  cmsProcedure,
  cmsWriteProcedure,
  collaboratorProcedure,
  createTRPCRouter,
} from "../../init";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { createOctokitInstance } from "@workspace/trpc/lib/cms/octokit";
import {
  cancelPreviewMessage,
  closePreviewSession,
  createPreviewSession,
  getPreviewSession,
  listLivePreviewSessions,
  resetPreviewSession,
} from "@workspace/trpc/lib/content-pilot";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

/**
 * Live-preview AI sessions: content-pilot runs the client site's dev server
 * on a preview/<id> branch while the client chats with Claude; the canvas
 * iframe shows the preview. Publish = squash-merge the branch into main.
 * Session state lives in content-pilot's DB — the hub proxies, never stores.
 */

const sessionForRepo = async (repoId: number, sessionId: string) => {
  const session = await getPreviewSession(repoId);
  if (!session || session.id !== sessionId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This editing session has already ended.",
    });
  }
  return session;
};

const deleteBranchRef = async (
  token: string,
  owner: string,
  repo: string,
  branch: string
) => {
  const octokit = createOctokitInstance(token);
  await octokit.rest.git
    .deleteRef({ owner, repo, ref: `heads/${branch}` })
    .catch(() => {
      // Branch may never have been pushed (no commits) — nothing to delete.
    });
};

export const previewSessionRouter = createTRPCRouter({
  /** Starts (or joins) the live-preview session for this project. */
  start: cmsWriteProcedure.mutation(async ({ ctx }) => {
    return createPreviewSession(
      ctx.repoId,
      ctx.user.name || ctx.user.email || undefined
    );
  }),

  /**
   * The caller's live sessions across all their projects — the dashboard
   * banner reminding them a preview is still running. Access mirrors
   * repos.listMine: admins see all, others see repos they collaborate on or
   * connected themselves.
   */
  listMine: collaboratorProcedure.query(async ({ ctx }) => {
    const live = await listLivePreviewSessions().catch(() => []);
    if (!live.length) return { sessions: [] };

    const conds: (SQL | undefined)[] = [
      inArray(
        hubProject.repoId,
        live.map((s) => s.repoId)
      ),
    ];
    if (!ctx.isAdmin) {
      const collabConds = (ctx.collaborations ?? [])
        .map((c) => c.repoId)
        .filter((id): id is number => id != null)
        .map((id) => eq(hubProject.repoId, id));
      const ownConnected = eq(
        hubProject.githubConnectedUserId,
        ctx.session.user.id
      );
      conds.push(or(ownConnected, ...collabConds));
    }
    const projects = await db
      .select({ repoId: hubProject.repoId })
      .from(hubProject)
      .where(and(...conds));
    const mine = new Set(projects.map((p) => p.repoId));
    return { sessions: live.filter((s) => mine.has(s.repoId)) };
  }),

  /** The active session (canvas polls this while starting). */
  get: cmsProcedure.query(async ({ ctx }) => {
    const session = await getPreviewSession(ctx.repoId);
    return { session };
  }),

  /** Discards the session: tears down the preview, deletes the branch. */
  close: cmsWriteProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await sessionForRepo(ctx.repoId, input.sessionId);
      await closePreviewSession(session.id, "discard");
      await deleteBranchRef(ctx.token, ctx.owner, ctx.repo, session.branch);
      return { closed: true };
    }),

  /**
   * Discards this session's changes but KEEPS it live: content-pilot resets the
   * preview branch back to production main and clears the AI context +
   * transcript. The branch is kept (now == main), so no deleteBranchRef.
   */
  reset: cmsWriteProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await sessionForRepo(ctx.repoId, input.sessionId);
      await resetPreviewSession(session.id);
      return { reset: true };
    }),

  /** Pauses the in-flight AI run for this session; the partial edit is reverted. */
  cancel: cmsWriteProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await sessionForRepo(ctx.repoId, input.sessionId);
      await cancelPreviewMessage(session.id);
      return { canceled: true };
    }),

  /**
   * Publishes the session: squash-merges preview/<id> into the default branch
   * via a PR (clean one-commit history + a recoverable artifact on conflict),
   * then deletes the branch and ends the session. Vercel deploys the merge.
   */
  publish: cmsFullAccessProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await sessionForRepo(ctx.repoId, input.sessionId);

      const [project] = await db
        .select({ defaultBranch: hubProject.defaultBranch })
        .from(hubProject)
        .where(eq(hubProject.repoId, ctx.repoId))
        .limit(1);
      const base = project?.defaultBranch || "main";

      const octokit = createOctokitInstance(ctx.token);
      let prNumber: number;
      try {
        const { data: pr } = await octokit.rest.pulls.create({
          owner: ctx.owner,
          repo: ctx.repo,
          title: `Site edits — AI session ${session.id}`,
          head: session.branch,
          base,
        });
        prNumber = pr.number;
      } catch (error) {
        const status = (error as { status?: number }).status;
        const message = String((error as Error).message || "");
        // "No commits between base and head" — the session never changed
        // anything. Just end it cleanly.
        if (status === 422 && /no commits/i.test(message)) {
          await closePreviewSession(session.id, "published");
          await deleteBranchRef(
            ctx.token,
            ctx.owner,
            ctx.repo,
            session.branch
          );
          return { merged: false, sha: null };
        }
        throw toTRPCError(error);
      }

      try {
        const { data: merge } = await octokit.rest.pulls.merge({
          owner: ctx.owner,
          repo: ctx.repo,
          pull_number: prNumber,
          merge_method: "squash",
        });
        await closePreviewSession(session.id, "published");
        await deleteBranchRef(
          ctx.token,
          ctx.owner,
          ctx.repo,
          session.branch
        );
        return { merged: true, sha: merge.sha };
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 405 || status === 409) {
          // Merge conflict: leave the PR and the session alive so nothing is
          // lost; the developer can resolve the PR by hand.
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "The live site changed while you were editing, so these edits can't be published automatically. Your changes are saved — please contact your developer to finish publishing them.",
          });
        }
        throw toTRPCError(error);
      }
    }),
});
