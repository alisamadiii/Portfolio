import { and, eq, or, type SQL } from "drizzle-orm";

import { hubProject } from "@workspace/drizzle/schema";

/**
 * WHERE clause for every project the caller can access. Admins see every
 * project. Everyone else sees repos they collaborate on, plus their own
 * imported repos: the user who connected GitHub gets access without a
 * collaborator invite. Takes collaboratorProcedure's ctx.
 */
export const accessibleProjectsWhere = (ctx: {
  isAdmin: boolean;
  collaborations: { repoId: number | null }[] | null;
  session: { user: { id: string } };
}): SQL | undefined => {
  const conds: (SQL | undefined)[] = [eq(hubProject.hidden, false)];
  if (!ctx.isAdmin) {
    const collabConds = (ctx.collaborations ?? [])
      .map((c) => c.repoId)
      .filter((id): id is number => id != null)
      .map((id) => eq(hubProject.repoId, id));
    conds.push(
      or(eq(hubProject.githubConnectedUserId, ctx.session.user.id), ...collabConds)
    );
  }
  return and(...conds);
};
