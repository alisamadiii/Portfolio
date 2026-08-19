import { cacheLife, cacheTag } from "next/cache";
import { TRPCError } from "@trpc/server";
import { isNotNull } from "drizzle-orm";

import { authenticatedProcedure, createTRPCRouter } from "../../init";

import { isAdminUser } from "@workspace/trpc/lib/cms/authz-shared";
import { collaboratorMatchesUser } from "@workspace/trpc/lib/cms/collaborator-access";
import {
  collaboratorTable,
  db as cmsDb,
  orgRepoTable,
} from "@workspace/trpc/lib/cms/db";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { toCmsUser } from "@workspace/trpc/lib/cms/session-user";

// The live website URL now lives on cms_org_repo (set per repo by an admin in
// the CMS settings). Status is derived by pinging that URL — no Stripe.

// Bare host only ("acme.com") — websiteUrl is hand-typed, so tolerate
// "https://acme.com/" etc. Keeps the probe URL and cache tag stable.
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
  getMine: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const user = toCmsUser(ctx.session.user);

      // Every org repo that has a website URL set. Admins see them all;
      // collaborators are filtered down to the repos they were invited to.
      const orgRows = await cmsDb
        .select()
        .from(orgRepoTable)
        .where(isNotNull(orgRepoTable.websiteUrl));

      let repos = orgRows;
      if (!isAdminUser(user)) {
        const collab = await cmsDb
          .select({
            owner: collaboratorTable.owner,
            repo: collaboratorTable.repo,
          })
          .from(collaboratorTable)
          .where(collaboratorMatchesUser(user));

        const allowed = new Set(
          collab.map((c) => `${c.owner.toLowerCase()}/${c.repo.toLowerCase()}`)
        );
        repos = orgRows.filter((r) =>
          allowed.has(`${r.owner.toLowerCase()}/${r.repo.toLowerCase()}`)
        );
      }

      return Promise.all(
        repos.map(async (r) => {
          const domain = normalizeDomain(r.websiteUrl as string);
          return {
            id: `${r.owner}/${r.repo}`,
            owner: r.owner,
            repo: r.repo,
            websiteUrl: r.websiteUrl,
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
