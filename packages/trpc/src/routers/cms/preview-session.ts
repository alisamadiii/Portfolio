import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import z from "zod";

import {
  isPreviewBranch,
  isValidBranchName,
} from "@workspace/trpc/lib/cms/branch-name";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { installationCommitAuthor } from "@workspace/trpc/lib/github-app";
import { requireFeature } from "@workspace/trpc/lib/payment/entitlements";
import { getBranchHeadSha } from "@workspace/trpc/lib/cms/github-cache-file";
import { createOctokitInstance } from "@workspace/trpc/lib/cms/octokit";
import {
  cancelPreviewMessage,
  closePreviewSession,
  createPreviewSession,
  getPreviewSession,
  listLivePreviewSessions,
  getImport,
  publishPreviewSession,
  resetPreviewSession,
  type PreviewSession,
} from "@workspace/trpc/lib/content-pilot";
import { isExternalHosting, parseHosting } from "@workspace/trpc/lib/hosting";
import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import {
  cmsFullAccessProcedure,
  cmsProcedure,
  cmsWriteProcedure,
  collaboratorProcedure,
  createTRPCRouter,
  requireGithubToken,
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

const projectHosting = async (repoId: number) => {
  const [project] = await db
    .select({ hosting: hubProject.hosting })
    .from(hubProject)
    .where(eq(hubProject.repoId, repoId))
    .limit(1);
  return parseHosting(project?.hosting);
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
      target ?? undefined,
      { owner: ctx.owner, repo: ctx.repo },
      await installationCommitAuthor(ctx.owner, ctx.repo)
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
    // Uploaded projects: local-only workspace, commits attributed to the hub
    // user directly (there is no GitHub noreply identity to derive).
    if (ctx.source === "upload") {
      return createPreviewSession(
        ctx.repoId,
        ctx.user.name || ctx.user.email || undefined,
        undefined,
        { owner: ctx.owner, repo: ctx.repo },
        ctx.user.email
          ? { name: ctx.user.name || ctx.user.email, email: ctx.user.email }
          : null,
        "upload"
      );
    }
    return createPreviewSession(
      ctx.repoId,
      ctx.user.name || ctx.user.email || undefined,
      undefined,
      { owner: ctx.owner, repo: ctx.repo },
      await installationCommitAuthor(ctx.owner, ctx.repo)
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
   * The live site: its URL and the latest build (every publish queues one on
   * content-pilot; static output only, served from the built dist/). Null
   * when the pilot is unreachable, so the header just hides the chip.
   */
  liveSite: cmsProcedure.query(async ({ ctx }) => {
    const hosting = await projectHosting(ctx.repoId);
    // Hosted elsewhere: no content-pilot live site or builds to report.
    if (isExternalHosting(hosting)) {
      return { hosting, liveUrl: null, live: false, build: null };
    }
    const status = await getImport(ctx.repoId).catch(() => null);
    if (!status) return null;
    return {
      hosting,
      liveUrl: status.liveUrl,
      live: status.live ?? false,
      build: status.build ?? null,
    };
  }),

  /**
   * Branches the client can preview: the default branch first, then every
   * named branch on GitHub (preview/* hidden). Fetched fresh, not from the
   * repo snapshot cache — the list changes on every create/publish.
   */
  branches: cmsProcedure.query(async ({ ctx }) => {
    // Uploaded projects live on a single local 'main' — no branch menu.
    const defaultBranch = await projectDefaultBranch(ctx.repoId);
    if (ctx.source === "upload") return { defaultBranch, branches: [] };
    const token = requireGithubToken(ctx);
    const named = (await listNamedBranches(token, ctx.owner, ctx.repo))
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
      const switchCtx = { ...ctx, token: requireGithubToken(ctx) };
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
      await assertCanLeave(switchCtx, current);
      return leaveAndStart(switchCtx, current, target);
    }),

  /**
   * Creates `name` on GitHub from the default branch's head and switches the
   * preview to it. Guarded like switchBranch BEFORE the ref is created, so a
   * refused switch leaves no orphan branch behind.
   */
  createBranch: cmsWriteProcedure
    .input(z.object({ name: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const switchCtx = { ...ctx, token: requireGithubToken(ctx) };
      const defaultBranch = await projectDefaultBranch(ctx.repoId);
      if (!isValidBranchName(input.name) || input.name === defaultBranch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That is not a valid branch name.",
        });
      }
      const current = await getPreviewSession(ctx.repoId);
      await assertCanLeave(switchCtx, current);

      const sha = await getBranchHeadSha(
        ctx.owner,
        ctx.repo,
        defaultBranch,
        switchCtx.token,
        { force: true }
      );
      const octokit = createOctokitInstance(switchCtx.token);
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
      return leaveAndStart(switchCtx, current, input.name);
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
      // Uploads have no remote refs; the local branch dies with the workspace
      // sync on the next session.
      if (ctx.source !== "upload" && isPreviewBranch(session.branch)) {
        const token = requireGithubToken(ctx);
        await deleteBranchRef(token, ctx.owner, ctx.repo, session.branch);
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
   * Publishes the session: content-pilot squashes its branch (preview/<id> or
   * a named branch) into the default branch locally as ONE commit authored by
   * the project owner (so git-contributor licensing like Netlify's sees a
   * known collaborator on the deployed branch), pushes, and the hub then
   * deletes the branch and ends the session. On a conflict nothing is lost —
   * the branch and session stay intact.
   */
  publish: cmsFullAccessProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireFeature(ctx.user, ctx.repoId, "ai-chat");
      const session = await sessionForRepo(ctx.repoId, input.sessionId);

      // Throws CONFLICT when production moved under the session (the pilot
      // restores the session branch, so nothing is lost).
      // Also queues the live-site build on the pilot (GitHub projects are
      // pushed first). The header's live-site chip tracks the build.
      // Externally hosted (Netlify, Vercel, Cloudflare…): push only, their
      // host deploys. No content-pilot build.
      const hosting = await projectHosting(ctx.repoId);
      const { sha, changed, build } = await publishPreviewSession(session.id, {
        liveBuild: !isExternalHosting(hosting),
      });

      await closePreviewSession(session.id, "published");
      if (ctx.source === "upload") {
        // Local-only publish: no GitHub refs to clean up. Bump the activity
        // timestamp so the gallery sorts the freshly published site up.
        await db
          .update(hubProject)
          .set({ githubUpdatedAt: new Date() })
          .where(eq(hubProject.repoId, ctx.repoId));
      } else {
        const token = requireGithubToken(ctx);
        await deleteBranchRef(token, ctx.owner, ctx.repo, session.branch);
      }
      return { merged: changed, sha, building: !!build, hosting };
    }),
});
