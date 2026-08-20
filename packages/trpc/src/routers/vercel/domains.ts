import { revalidateTag } from "next/cache";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import z from "zod";

import {
  adminProcedure,
  cmsProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { hubDomain, hubProject } from "@workspace/drizzle/schema";

import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { resolveRepoId } from "@workspace/trpc/lib/cms/repo-id";
import {
  addProjectDomain,
  deleteProjectDomain,
  deriveWebsiteUrl,
  resolveVercelProjectId,
  syncDomainsForRepo,
  updateProjectDomain,
  verifyProjectDomain,
} from "@workspace/trpc/lib/vercel/domains";

// Domain management is deliberately open to every collaborator of the repo
// (cmsProcedure, no admin assert) — clients manage their own domains. The
// only server-side guard: *.vercel.app domains cannot be removed.

// The home page website-status card caches per-URL ping results under this
// tag; bust it whenever the domain set (and thus the derived URL) changes.
const revalidateWebsiteStatus = () =>
  revalidateTag("website-status", { expire: 0 });

/**
 * Domains of the repo's linked Vercel project, from the DB. First open (no
 * cached vercelProjectId, no rows) attempts one sync to seed both; a repo
 * without a GitHub-linked Vercel project returns { linked: false }.
 */
const list = cmsProcedure.query(async ({ input }) => {
  try {
    const repoId = await resolveRepoId(input.owner, input.repo);

    let domains = await db
      .select()
      .from(hubDomain)
      .where(eq(hubDomain.repoId, repoId));

    if (domains.length === 0) {
      const [row] = await db
        .select({ vercelProjectId: hubProject.vercelProjectId })
        .from(hubProject)
        .where(eq(hubProject.repoId, repoId))
        .limit(1);

      try {
        domains = await syncDomainsForRepo(repoId);
        if (!row?.vercelProjectId) revalidateWebsiteStatus();
      } catch (error) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return { linked: false as const, domains: [], websiteUrl: null };
        }
        throw error;
      }
    }

    return {
      linked: true as const,
      domains,
      websiteUrl: deriveWebsiteUrl(domains),
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw toTRPCError(error);
  }
});

/** Add a domain to the project. Returns the fresh list + the added row (its
 * verification/dnsConfig power the DNS instructions screen). */
const add = cmsProcedure
  .input(
    z.object({
      domain: z.string().trim().toLowerCase().min(3),
      redirect: z.string().nullable().optional(),
      gitBranch: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const projectId = await resolveVercelProjectId(repoId);

      await addProjectDomain(projectId, {
        name: input.domain,
        redirect: input.redirect ?? undefined,
        gitBranch: input.gitBranch ?? undefined,
      });

      const domains = await syncDomainsForRepo(repoId);
      revalidateWebsiteStatus();

      return {
        domains,
        added: domains.find((d) => d.domain === input.domain) ?? null,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

const remove = cmsProcedure
  .input(z.object({ domain: z.string().trim().toLowerCase() }))
  .mutation(async ({ input }) => {
    try {
      if (input.domain.endsWith(".vercel.app")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The default .vercel.app domain cannot be removed.",
        });
      }
      const repoId = await resolveRepoId(input.owner, input.repo);
      const projectId = await resolveVercelProjectId(repoId);

      await deleteProjectDomain(projectId, input.domain);

      const domains = await syncDomainsForRepo(repoId);
      revalidateWebsiteStatus();

      return { domains };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

const update = cmsProcedure
  .input(
    z.object({
      domain: z.string().trim().toLowerCase(),
      redirect: z.string().nullable().optional(),
      redirectStatusCode: z
        .union([
          z.literal(301),
          z.literal(302),
          z.literal(307),
          z.literal(308),
        ])
        .nullable()
        .optional(),
      gitBranch: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const repoId = await resolveRepoId(input.owner, input.repo);
      const projectId = await resolveVercelProjectId(repoId);

      await updateProjectDomain(projectId, input.domain, {
        redirect: input.redirect,
        redirectStatusCode: input.redirectStatusCode,
        gitBranch: input.gitBranch,
      });

      const domains = await syncDomainsForRepo(repoId);
      revalidateWebsiteStatus();

      return { domains };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

/** The Refresh button: re-run verification on every unverified domain, then
 * re-sync everything (verified/misconfigured/config) from Vercel. */
const refresh = cmsProcedure.mutation(async ({ input }) => {
  try {
    const repoId = await resolveRepoId(input.owner, input.repo);
    const projectId = await resolveVercelProjectId(repoId);

    const unverified = await db
      .select({ domain: hubDomain.domain })
      .from(hubDomain)
      .where(
        and(eq(hubDomain.repoId, repoId), eq(hubDomain.verified, false))
      );

    await Promise.all(
      unverified.map((row) =>
        verifyProjectDomain(projectId, row.domain).catch(() => null)
      )
    );

    const domains = await syncDomainsForRepo(repoId);
    revalidateWebsiteStatus();

    return { domains, websiteUrl: deriveWebsiteUrl(domains) };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw toTRPCError(error);
  }
});

/** Admin backfill/ops: sync every org repo's domains, report per-repo result. */
const syncAll = adminProcedure.mutation(async () => {
  const repos = await db
    .select({ repoId: hubProject.repoId, repo: hubProject.repo })
    .from(hubProject);

  const results: { repo: string; status: string }[] = [];
  for (const row of repos) {
    try {
      const domains = await syncDomainsForRepo(row.repoId);
      results.push({ repo: row.repo, status: `synced ${domains.length}` });
    } catch (error) {
      const notLinked =
        error instanceof TRPCError && error.code === "NOT_FOUND";
      results.push({
        repo: row.repo,
        status: notLinked
          ? "no vercel project"
          : `error: ${error instanceof Error ? error.message : "unknown"}`,
      });
    }
  }
  revalidateWebsiteStatus();
  return results;
});

const domainsRouter = createTRPCRouter({
  list,
  add,
  remove,
  update,
  refresh,
  syncAll,
});

export { domainsRouter };
