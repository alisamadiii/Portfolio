import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";

// The (owner, repo) for a projectId. Returns undefined when no project row exists — the
// fail-open agency-gate procedures rely on that instead of throwing.
async function resolveProjectByProjectId(
  projectId: string
): Promise<{ owner: string; repo: string; source: string } | undefined> {
  const [row] = await db
    .select({
      owner: hubProject.owner,
      repo: hubProject.repo,
      source: hubProject.source,
    })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  return row ?? undefined;
}

export { resolveProjectByProjectId };
