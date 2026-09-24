import { cacheLife, cacheTag } from "next/cache";
import { TRPCError } from "@trpc/server";

import { collaboratorProcedure, createTRPCRouter } from "../../init";

import { db as cmsDb, orgRepoTable } from "@workspace/trpc/lib/cms/db";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";

// The live website URL is the project's stored hub_project.website_url. Status
// is derived by pinging it.

// Bare host only ("acme.com") — tolerate "https://acme.com/" etc. Keeps the
// probe URL and cache tag stable.
const normalizeDomain = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

const checkWebsiteStatus = async (domain: string) => {
  "use cache";
  cacheLife("minutes");
  cacheTag("website-status", `website-status-${domain}`);

  const start = Date.now();
  try {
    // < 500 counts as up: auth walls and redirects aren't outages.
    const res = await fetch(`https://${domain}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return {
      up: res.status < 500,
      httpStatus: res.status,
      https: true,
      responseTimeMs: Date.now() - start,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      up: false,
      httpStatus: null,
      https: false,
      responseTimeMs: null,
      checkedAt: Date.now(),
    };
  }
};

export const websitesRouter = createTRPCRouter({
  getMine: collaboratorProcedure.query(async ({ ctx }) => {
    try {
      // Every project whose site has a stored website URL. Admins see them
      // all; everyone else is filtered to the repos they collaborate on plus
      // their own imported projects (the user who connected GitHub for them).
      const orgRows = await cmsDb.select().from(orgRepoTable);

      let repos = orgRows.filter((r) => r.websiteUrl);
      if (ctx.collaborations) {
        const allowed = new Set(
          ctx.collaborations.map(
            (c) => `${c.owner.toLowerCase()}/${c.repo.toLowerCase()}`
          )
        );
        const userId = ctx.session.user.id;
        repos = repos.filter(
          (r) =>
            allowed.has(`${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`) ||
            r.githubConnectedUserId === userId
        );
      }

      return Promise.all(
        repos.map(async (r) => {
          const websiteUrl = r.websiteUrl as string;
          const domain = normalizeDomain(websiteUrl);
          return {
            id: `${r.owner}/${r.repo}`,
            owner: r.owner,
            repo: r.repo,
            websiteUrl,
            domain,
            label: r.repo,
            githubUrl: `https://github.com/${r.owner}/${r.repo}`,
            status: await checkWebsiteStatus(domain),
          };
        })
      );
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),
});
