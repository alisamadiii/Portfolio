import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";

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

// Reverse of resolveRepoId: the (owner, repo) for a GitHub-stable repoId, which
// is unique in hubProject. Returns undefined when no project row exists — the
// fail-open agency-gate procedures rely on that instead of throwing.
async function resolveProjectByRepoId(
  repoId: number
): Promise<{ owner: string; repo: string } | undefined> {
  const [row] = await db
    .select({ owner: hubProject.owner, repo: hubProject.repo })
    .from(hubProject)
    .where(eq(hubProject.repoId, repoId))
    .limit(1);
  return row ?? undefined;
}

export { resolveRepoId, resolveProjectByRepoId };
