import { TRPCError } from "@trpc/server";
import { eq, isNotNull } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import { hubDomain, hubProject } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { createOctokitInstance } from "../lib/cms/octokit";
import {
  getConnectedAccount,
  getIntegrationAccessToken,
} from "../lib/integrations";
import {
  getPagesProjectDomains,
  getWorkerDomains,
  getWorkerUrls,
  getWorkersDevSubdomain,
  listCfAccounts,
  listCfWorkers,
  listCfZones,
  listPagesProjects,
} from "./integrations/cloudflare";
import {
  createRepoWebhook,
  findRepoWebhook,
  githubWebhookUrl,
} from "./integrations/github";

// ─── Deploy / import flow ────────────────────────────────────────
// "Add project" with two sources (both require GitHub + Cloudflare connected):
//  • GitHub — pick a repo + enter its live domain (used for the iframe preview).
//  • Cloudflare — pick an existing CF Worker/Pages project; we pull its domains,
//    URLs and (Pages only) the connected repo.
// Every project is repo-keyed (hub_project.repoId), so a GitHub repo is always
// required. Imported projects are the user's own, so rows are selfDeployed to
// survive syncOrgRepos' reconcile.

const githubToken = (userId: string) =>
  getIntegrationAccessToken(userId, "github", "GitHub");
const cloudflareToken = (userId: string) =>
  getIntegrationAccessToken(userId, "cloudflare", "Cloudflare");

const splitRepo = (fullName: string) => {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid repository." });
  }
  return { owner, repo };
};

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
};

/** Insert domain rows for a project, first one primary when none exist yet. */
async function addDomains(repoId: number, domains: string[]) {
  const norm = [
    ...new Set(
      domains
        .map((d) => d.trim().toLowerCase())
        .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
    ),
  ];
  if (norm.length === 0) return;
  const existing = await db
    .select({ domain: hubDomain.domain })
    .from(hubDomain)
    .where(eq(hubDomain.repoId, repoId));
  const have = new Set(existing.map((e) => e.domain));
  const hadRows = existing.length > 0;
  const toInsert = norm.filter((d) => !have.has(d));
  if (toInsert.length === 0) return;
  // These come straight from CF (workers.dev route + existing custom domains) —
  // already serving, so they land active, not pending.
  await db.insert(hubDomain).values(
    toInsert.map((domain, i) => ({
      repoId,
      domain,
      isPrimary: !hadRows && i === 0,
      status: "active",
    }))
  );
}

type CfImport = {
  accountId: string;
  name: string;
  productionUrl: string;
  previewUrl?: string | null;
};

/**
 * Create or attach the hub_project for an imported repo. Blocks only when the
 * project already carries a live CF URL (already imported); otherwise upserts
 * by repoId so org-synced/existing rows are reused.
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
  cf?: CfImport,
  dnsZoneId?: string | null
) {
  const [existing] = await db
    .select({
      owner: hubProject.owner,
      repo: hubProject.repo,
      cfPagesSubdomain: hubProject.cfPagesSubdomain,
    })
    .from(hubProject)
    .where(eq(hubProject.repoId, ghRepo.id))
    .limit(1);
  if (existing?.cfPagesSubdomain) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `${existing.owner}/${existing.repo} is already connected. Open it from your projects.`,
    });
  }
  const cfFields = {
    cfConnectedUserId: userId,
    // The importing user owns this repo — commits/reads/webhook use their token.
    githubConnectedUserId: userId,
    ...(cf
      ? {
          cfAccountId: cf.accountId,
          cfPagesProject: cf.name,
          cfPagesSubdomain: cf.productionUrl,
          cfPreviewUrl: cf.previewUrl ?? null,
        }
      : {}),
    ...(dnsZoneId ? { cfZoneId: dnsZoneId } : {}),
  };
  if (existing) {
    await db
      .update(hubProject)
      .set(cfFields)
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
      selfDeployed: true,
      ...cfFields,
    });
  }

  await registerProjectWebhook(userId, ghRepo);
}

/**
 * Register a push webhook on the user's repo (best-effort) so external pushes
 * refresh the CMS cache — mirrors the org webhook. Skips silently when the
 * endpoint/secret aren't configured, a hook already exists, or the user lacks
 * admin on the repo. Never blocks the import.
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
  // Gate + account picker: which integrations are connected + usable CF accounts.
  connections: authenticatedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [github, cloudflare] = await Promise.all([
      getConnectedAccount(userId, "github", "repo"),
      getConnectedAccount(userId, "cloudflare"),
    ]);
    let cfAccounts: { id: string; name: string }[] = [];
    let cloudflareReady = false;
    if (cloudflare) {
      try {
        cfAccounts = await listCfAccounts(await cloudflareToken(userId));
        cloudflareReady = true;
      } catch {
        cloudflareReady = false;
      }
    }
    return {
      github: !!github,
      cloudflare: !!cloudflare,
      cloudflareReady,
      cfAccounts,
    };
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

  // The caller's Cloudflare Workers + Pages projects (for the CF import list).
  cloudflareProjects: authenticatedProcedure
    .input(z.object({ accountId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const token = await cloudflareToken(ctx.session.user.id);
      // Workers are the primary target — let their errors surface (e.g. a
      // missing read scope). Pages are optional; tolerate their failure.
      const [workers, sub] = await Promise.all([
        listCfWorkers(token, input.accountId),
        getWorkersDevSubdomain(token, input.accountId).catch(() => ""),
      ]);
      const pages = await listPagesProjects(token, input.accountId).catch(
        () => [] as Awaited<ReturnType<typeof listPagesProjects>>
      );
      const pageItems = pages.map((p) => ({
        type: "pages" as const,
        name: p.name,
        url: p.subdomain ? `https://${p.subdomain}` : "",
        repo: p.repo,
      }));
      const workerItems = workers.map((w) => ({
        type: "worker" as const,
        name: w.id,
        url: sub ? `https://${w.id}.${sub}.workers.dev` : "",
        repo: null as { owner: string; repo: string } | null,
      }));
      return [...pageItems, ...workerItems];
    }),

  // Domains + URLs for a chosen CF project (fetched on select, not in the list).
  cloudflareProjectDetail: authenticatedProcedure
    .input(
      z.object({
        accountId: z.string().min(1),
        type: z.enum(["worker", "pages"]),
        name: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const token = await cloudflareToken(ctx.session.user.id);
      if (input.type === "pages") {
        const domains = await getPagesProjectDomains(
          token,
          input.accountId,
          input.name
        );
        return { domains, previewUrl: null as string | null };
      }
      const [domains, urls] = await Promise.all([
        getWorkerDomains(token, input.accountId, input.name),
        getWorkerUrls(token, input.accountId, input.name),
      ]);
      return { domains, previewUrl: urls.preview };
    }),

  // CF zones on an account — for the optional DNS-zone picker during import.
  cfZones: authenticatedProcedure
    .input(z.object({ accountId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const token = await cloudflareToken(ctx.session.user.id);
      const zones = await listCfZones(token, input.accountId);
      return zones.map((z) => ({ id: z.id, name: z.name }));
    }),

  // GitHub source: link a repo + its live domain (used for the iframe preview).
  importGithub: authenticatedProcedure
    .input(
      z.object({
        repoFullName: z.string().min(1),
        domain: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a valid domain."),
        dnsZoneId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const ghRepo = await resolveRepo(userId, input.repoFullName);
      await upsertProject(userId, ghRepo, undefined, input.dnsZoneId);
      await addDomains(ghRepo.id, [input.domain]);
      return { repo: ghRepo.repo };
    }),

  // Cloudflare source: import an existing Worker/Pages project wholesale.
  importCloudflare: authenticatedProcedure
    .input(
      z.object({
        accountId: z.string().min(1),
        type: z.enum(["worker", "pages"]),
        name: z.string().min(1),
        repoFullName: z.string().min(1),
        url: z.string().min(1),
        previewUrl: z.string().nullish(),
        domains: z.array(z.string()).default([]),
        dnsZoneId: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const ghRepo = await resolveRepo(userId, input.repoFullName);
      await upsertProject(
        userId,
        ghRepo,
        {
          accountId: input.accountId,
          name: input.name,
          productionUrl: input.url,
          previewUrl: input.previewUrl ?? null,
        },
        input.dnsZoneId
      );
      // Custom domains, else the CF host so the preview still renders.
      const domains =
        input.domains.length > 0 ? input.domains : [hostOf(input.url)];
      await addDomains(ghRepo.id, domains);
      return { repo: ghRepo.repo };
    }),

  // Per-project config flags for the projects grid chips. Takes the owner/repo
  // pairs the caller already lists and returns only those, so nothing leaks.
  projectFlags: authenticatedProcedure
    .input(
      z.object({
        repos: z.array(z.object({ owner: z.string(), repo: z.string() })),
      })
    )
    .query(async ({ input }) => {
      const out: Record<string, { cloudflare: boolean; dns: boolean }> = {};
      if (input.repos.length === 0) return out;
      const wanted = new Set(
        input.repos.map((r) => `${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`)
      );
      const [projects, dnsRows] = await Promise.all([
        db
          .select({
            repoId: hubProject.repoId,
            owner: hubProject.owner,
            repo: hubProject.repo,
            cfConnectedUserId: hubProject.cfConnectedUserId,
            cfPagesSubdomain: hubProject.cfPagesSubdomain,
          })
          .from(hubProject),
        db
          .select({ repoId: hubDomain.repoId })
          .from(hubDomain)
          .where(isNotNull(hubDomain.cfZoneId)),
      ]);
      const dnsRepoIds = new Set(dnsRows.map((r) => r.repoId));
      for (const p of projects) {
        const key = `${p.owner.toLowerCase()}/${p.repo.toLowerCase()}`;
        if (!wanted.has(key)) continue;
        out[key] = {
          cloudflare: !!(p.cfConnectedUserId || p.cfPagesSubdomain),
          dns: dnsRepoIds.has(p.repoId),
        };
      }
      return out;
    }),
});
