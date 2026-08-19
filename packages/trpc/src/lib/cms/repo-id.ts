import { TRPCError } from "@trpc/server";
import { and, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { cmsOrgRepo } from "@workspace/drizzle/schema";

// Resolve a project's GitHub-stable repoId from its (owner, repo), matching the
// case-insensitive unique index on cmsOrgRepo. Owner defaults to GITHUB_ORG.
async function resolveRepoId(
  owner: string | undefined,
  repo: string
): Promise<number> {
  const org = owner ?? process.env.GITHUB_ORG;
  if (!org) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Missing owner" });
  }
  const [row] = await db
    .select({ repoId: cmsOrgRepo.repoId })
    .from(cmsOrgRepo)
    .where(
      and(
        sql`lower(${cmsOrgRepo.owner}) = lower(${org})`,
        sql`lower(${cmsOrgRepo.repo}) = lower(${repo})`
      )
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return row.repoId;
}

export { resolveRepoId };
