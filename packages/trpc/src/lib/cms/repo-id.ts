import { TRPCError } from "@trpc/server";
import { and, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

// Resolve a project's GitHub-stable repoId from its (owner, repo), matching the
// case-insensitive unique index on hubProject.
async function resolveRepoId(
  owner: string | undefined,
  repo: string
): Promise<number> {
  if (!owner) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Missing owner" });
  }
  const [row] = await db
    .select({ repoId: hubProject.repoId })
    .from(hubProject)
    .where(
      and(
        sql`lower(${hubProject.owner}) = lower(${owner})`,
        sql`lower(${hubProject.repo}) = lower(${repo})`
      )
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  return row.repoId;
}

export { resolveRepoId };
