import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { createOctokitInstance } from "../lib/cms/octokit";
import {
  getConnectedAccount,
  getIntegrationAccessToken,
} from "../lib/integrations";
import {
  createRepoWebhook,
  findRepoWebhook,
  githubWebhookUrl,
} from "./integrations/github";

// ─── Deploy / import flow ────────────────────────────────────────
// "Add project": pick a GitHub repo + enter its live website URL (used for the
// iframe preview + as the project's website_url). Every project is repo-keyed
// (hub_project.repoId). The importing user's id is stored as
// githubConnectedUserId — that user owns the project (commits/reads/webhook use
// their token).

const githubToken = (userId: string) =>
  getIntegrationAccessToken(userId, "github", "GitHub");

const splitRepo = (fullName: string) => {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid repository." });
  }
  return { owner, repo };
};

/**
 * Create or attach the hub_project for an imported repo. Upserts by repoId so
 * existing rows are reused; sets the project's website_url when provided.
 */
async function upsertProject(
  userId: string,
  ghRepo: {
    id: number;
    owner: string;
    repo: string;
    private: boolean;
    defaultBranch: string;
    updatedAt: string | null;
  },
  websiteUrl?: string | null
) {
  const [existing] = await db
    .select({
      owner: hubProject.owner,
      repo: hubProject.repo,
      githubConnectedUserId: hubProject.githubConnectedUserId,
    })
    .from(hubProject)
    .where(eq(hubProject.repoId, ghRepo.id))
    .limit(1);
  // Never let a re-import reassign a project that another user already owns.
  if (
    existing?.githubConnectedUserId &&
    existing.githubConnectedUserId !== userId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${existing.owner}/${existing.repo} is already owned by another user.`,
    });
  }
  const fields = {
    // The importing user owns this repo — commits/reads/webhook use their token.
    githubConnectedUserId: userId,
    ...(websiteUrl ? { websiteUrl } : {}),
  };
  if (existing) {
    await db
      .update(hubProject)
      .set(fields)
      .where(eq(hubProject.repoId, ghRepo.id));
  } else {
    await db.insert(hubProject).values({
      repoId: ghRepo.id,
      owner: ghRepo.owner,
      repo: ghRepo.repo,
      private: ghRepo.private,
      defaultBranch: ghRepo.defaultBranch,
      githubUpdatedAt: new Date(ghRepo.updatedAt ?? Date.now()),
      syncedAt: new Date(),
      ...fields,
    });
  }

  await registerProjectWebhook(userId, ghRepo);
}

/**
 * Register a push webhook on the user's repo (best-effort) so external pushes
 * refresh the CMS cache. Skips silently when the endpoint/secret aren't
 * configured, a hook already exists, or the user lacks admin on the repo.
 * Never blocks the import.
 */
async function registerProjectWebhook(
  userId: string,
  ghRepo: { id: number; owner: string; repo: string }
) {
  const url = githubWebhookUrl();
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!url || !secret) return;
  try {
    const token = await githubToken(userId);
    const existingHook = await findRepoWebhook(token, ghRepo.owner, ghRepo.repo, url);
    const hookId =
      existingHook ??
      (await createRepoWebhook(token, ghRepo.owner, ghRepo.repo, url, secret));
    await db
      .update(hubProject)
      .set({ githubWebhookId: hookId })
      .where(eq(hubProject.repoId, ghRepo.id));
  } catch (error) {
    console.error("Failed to register GitHub webhook", ghRepo.repo, error);
  }
}

/** Resolve a GitHub repo's canonical metadata via the caller's token. */
async function resolveRepo(userId: string, repoFullName: string) {
  const { owner, repo } = splitRepo(repoFullName);
  const octokit = createOctokitInstance(await githubToken(userId));
  const { data } = await octokit.rest.repos.get({ owner, repo });
  // Read access (public repos, or any repo you can pull) is not enough to
  // claim a project — require admin/push so a stranger can't import someone
  // else's public repo and take ownership of the hub project.
  if (!(data.permissions?.admin || data.permissions?.push)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You need write access to this repository to import it.",
    });
  }
  return {
    id: data.id,
    owner: data.owner.login,
    repo: data.name,
    private: data.private,
    defaultBranch: data.default_branch,
    updatedAt: data.updated_at ?? null,
  };
}

export const deployRouter = createTRPCRouter({
  // Gate: whether the caller's GitHub account is connected (import source).
  connections: authenticatedProcedure.query(async ({ ctx }) => {
    const github = await getConnectedAccount(ctx.session.user.id, "github", "repo");
    return { github: !!github };
  }),

  // The caller's own GitHub repos, newest push first.
  githubRepos: authenticatedProcedure.query(async ({ ctx }) => {
    const octokit = createOctokitInstance(await githubToken(ctx.session.user.id));
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "pushed",
      affiliation: "owner,collaborator,organization_member",
      per_page: 100,
    });
    return data.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      owner: r.owner.login,
      name: r.name,
      defaultBranch: r.default_branch,
      private: r.private,
      pushedAt: r.pushed_at,
    }));
  }),

  // GitHub source: link a repo + its live website URL (iframe preview + website_url).
  importGithub: authenticatedProcedure
    .input(
      z.object({
        repoFullName: z.string().min(1),
        domain: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a valid domain."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const ghRepo = await resolveRepo(userId, input.repoFullName);
      await upsertProject(userId, ghRepo, `https://${input.domain}`);
      return { repo: ghRepo.repo };
    }),
});
