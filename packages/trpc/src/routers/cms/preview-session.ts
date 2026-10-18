import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import z from "zod";

import {
  isPreviewBranch,
  isValidBranchName,
} from "@workspace/trpc/lib/cms/branch-name";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { requireProjectPlan } from "@workspace/trpc/lib/cms/feature-access";
import { getBranchHeadSha } from "@workspace/trpc/lib/cms/github-cache-file";
import { createOctokitInstance } from "@workspace/trpc/lib/cms/octokit";
import {
  cancelPreviewMessage,
  closePreviewSession,
  createPreviewSession,
  getPreviewSession,
  listLivePreviewSessions,
  resetPreviewSession,
  type PreviewSession,
} from "@workspace/trpc/lib/content-pilot";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  cmsFullAccessProcedure,
  cmsProcedure,
  cmsWriteProcedure,
  collaboratorProcedure,
  createTRPCRouter,
} from "../../init";

/**
 * Live-preview AI sessions: content-pilot runs the client site's dev server
 * while the client chats with Claude; the canvas iframe shows the preview.
 * Session state lives in content-pilot's DB — the hub proxies, never stores.
 *
 * Branches: a session either previews the default branch on an ephemeral
 * `preview/<id>` (deleted on close/publish), or runs ON a named branch the
 * client created to try something out (every turn commits there, so it
 * survives close, idle and switching away). Publish squash-merges either kind
 * into the default branch and deletes it. One clone per repo on content-pilot
 * means one live session per repo, so switching = close + start.
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

const projectDefaultBranch = async (repoId: number) => {
  const [project] = await db
    .select({ defaultBranch: hubProject.defaultBranch })
    .from(hubProject)
    .where(eq(hubProject.repoId, repoId))
    .limit(1);
  return project?.defaultBranch || "main";
};

/** Every branch on GitHub except content-pilot's ephemeral preview/* ones. */
const listNamedBranches = async (
  token: string,
  owner: string,
  repo: string
) => {
  const octokit = createOctokitInstance(token);
  const names: string[] = [];
  let page = 1;
  for (;;) {
    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      page,
      per_page: 100,
    });
    names.push(...data.map((b) => b.name));
    if (data.length < 100) break;
    page += 1;
  }
  return names.filter((name) => !isPreviewBranch(name));
};

/** True when `head` has commits the default branch doesn't (unpublished edits). */
const hasUnpublishedCommits = async (
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string
) => {
  const octokit = createOctokitInstance(token);
  try {
    const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });
    return data.ahead_by > 0;
  } catch (error) {
    // The preview branch is only pushed on the first commit — no ref means
    // no changes.
    if ((error as { status?: number }).status === 404) return false;
    throw toTRPCError(error);
  }
};

const LIVE_OR_PAUSED: PreviewSession["status"][] = [
  "starting",
  "installing",
  "ready",
  "restarting",
  "paused",
];

type SwitchCtx = {
  token: string;
  owner: string;
  repo: string;
  repoId: number;
  user: { name?: string | null; email?: string | null };
};

/**
 * Switching away from a default-branch preview deletes its `preview/<id>`
 * branch, so unpublished edits there would be lost: refuse until the client
 * publishes or discards. Named branches keep their commits on GitHub, so
 * leaving them is always safe.
 */
const assertCanLeave = async (
  ctx: SwitchCtx,
  current: PreviewSession | null
) => {
  if (!current || !LIVE_OR_PAUSED.includes(current.status)) return;
  if (!isPreviewBranch(current.branch)) return;
  const base = await projectDefaultBranch(ctx.repoId);
  if (
    await hasUnpublishedCommits(
      ctx.token,
      ctx.owner,
      ctx.repo,
      base,
      current.branch
    )
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Publish or discard your changes before switching branches.",
    });
  }
};

/** Ends `current` (if live) and starts a session on `target` (null = default). */
const leaveAndStart = async (
  ctx: SwitchCtx,
  current: PreviewSession | null,
  target: string | null
) => {
  if (current && LIVE_OR_PAUSED.includes(current.status)) {
    await closePreviewSession(current.id, "discard");
    if (isPreviewBranch(current.branch)) {
      await deleteBranchRef(ctx.token, ctx.owner, ctx.repo, current.branch);
    }
  }
  try {
    return await createPreviewSession(
      ctx.repoId,
      ctx.user.name || ctx.user.email || undefined,
      target ?? undefined
    );
  } catch (error) {
    if (error instanceof TRPCError && error.message === "branch_mismatch") {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Another tab switched branches at the same time. Reload and try again.",
      });
    }
    throw error;
  }
};

export const previewSessionRouter = createTRPCRouter({
  /**
   * Starts (or joins) the live-preview session for this project. Deliberately
   * NOT plan-gated: previewing the website is free — only AI chat (edit-token
   * mint) and publish require the plan.
   */
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

  /**
   * Branches the client can preview: the default branch first, then every
   * named branch on GitHub (preview/* hidden). Fetched fresh, not from the
   * repo snapshot cache — the list changes on every create/publish.
   */
  branches: cmsProcedure.query(async ({ ctx }) => {
    const defaultBranch = await projectDefaultBranch(ctx.repoId);
    const named = (await listNamedBranches(ctx.token, ctx.owner, ctx.repo))
      .filter((name) => name !== defaultBranch)
      .sort((a, b) => a.localeCompare(b));
    return { defaultBranch, branches: named };
  }),

  /**
   * Moves the project's preview to `branch` (the default branch = a fresh
   * preview/<id> session). Closes the current session first; refuses while a
   * default-branch preview still has unpublished edits.
   */
  switchBranch: cmsWriteProcedure
    .input(z.object({ branch: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const defaultBranch = await projectDefaultBranch(ctx.repoId);
      const target = input.branch === defaultBranch ? null : input.branch;
      if (target !== null && !isValidBranchName(target)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That is not a valid branch name.",
        });
      }
      const current = await getPreviewSession(ctx.repoId);
      const alreadyThere =
        current &&
        LIVE_OR_PAUSED.includes(current.status) &&
        (target === null
          ? isPreviewBranch(current.branch)
          : current.branch === target);
      if (alreadyThere) return current;
      await assertCanLeave(ctx, current);
      return leaveAndStart(ctx, current, target);
    }),

  /**
   * Creates `name` on GitHub from the default branch's head and switches the
   * preview to it. Guarded like switchBranch BEFORE the ref is created, so a
   * refused switch leaves no orphan branch behind.
   */
  createBranch: cmsWriteProcedure
    .input(z.object({ name: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const defaultBranch = await projectDefaultBranch(ctx.repoId);
      if (!isValidBranchName(input.name) || input.name === defaultBranch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That is not a valid branch name.",
        });
      }
      const current = await getPreviewSession(ctx.repoId);
      await assertCanLeave(ctx, current);

      const sha = await getBranchHeadSha(
        ctx.owner,
        ctx.repo,
        defaultBranch,
        ctx.token,
        { force: true }
      );
      const octokit = createOctokitInstance(ctx.token);
      try {
        await octokit.rest.git.createRef({
          owner: ctx.owner,
          repo: ctx.repo,
          ref: `refs/heads/${input.name}`,
          sha,
        });
      } catch (error) {
        const status = (error as { status?: number }).status;
        const message = String((error as Error).message || "");
        if (status === 422 && /already exists/i.test(message)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A branch with that name already exists.",
          });
        }
        throw toTRPCError(error);
      }
      return leaveAndStart(ctx, current, input.name);
    }),

  /**
   * Discards the session: tears down the preview. The ephemeral preview/<id>
   * branch is deleted; a named branch keeps its commits for next time.
   */
  close: cmsWriteProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await sessionForRepo(ctx.repoId, input.sessionId);
      await closePreviewSession(session.id, "discard");
      if (isPreviewBranch(session.branch)) {
        await deleteBranchRef(ctx.token, ctx.owner, ctx.repo, session.branch);
      }
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
   * Publishes the session: squash-merges its branch (preview/<id> or a named
   * branch) into the default branch via a PR (clean one-commit history + a
   * recoverable artifact on conflict), then deletes the branch and ends the
   * session. Vercel deploys the merge.
   */
  publish: cmsFullAccessProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectPlan(ctx.user, ctx.repoId, {
        owner: ctx.owner,
        repo: ctx.repo,
      });
      const session = await sessionForRepo(ctx.repoId, input.sessionId);
      const base = await projectDefaultBranch(ctx.repoId);

      const octokit = createOctokitInstance(ctx.token);
      let prNumber: number;
      try {
        const { data: pr } = await octokit.rest.pulls.create({
          owner: ctx.owner,
          repo: ctx.repo,
          title: isPreviewBranch(session.branch)
            ? `Site edits — AI session ${session.id}`
            : `Site edits — branch ${session.branch}`,
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
          await deleteBranchRef(ctx.token, ctx.owner, ctx.repo, session.branch);
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
        await deleteBranchRef(ctx.token, ctx.owner, ctx.repo, session.branch);
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
