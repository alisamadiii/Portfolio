import { and, eq, inArray, or, type SQL } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { agencyClient, hubProject } from "@workspace/drizzle/schema";

/**
 * WHERE clause for every project the caller can access. Admins see every
 * project. Everyone else sees repos they collaborate on, their own imported
 * repos (the user who connected GitHub gets access without a collaborator
 * invite), and the website of the agency account they own. Takes
 * collaboratorProcedure's ctx.
 */
export const accessibleProjectsWhere = (ctx: {
  isAdmin: boolean;
  collaborations: { projectId: string | null }[] | null;
  session: { user: { id: string } };
}): SQL | undefined => {
  const conds: (SQL | undefined)[] = [eq(hubProject.hidden, false)];
  if (!ctx.isAdmin) {
    const collabConds = (ctx.collaborations ?? [])
      .map((c) => c.projectId)
      .filter((id): id is string => id != null)
      .map((id) => eq(hubProject.id, id));
    const ownedAgency = inArray(
      hubProject.id,
      db
        .select({ projectId: agencyClient.projectId })
        .from(agencyClient)
        .where(eq(agencyClient.userId, ctx.session.user.id))
    );
    conds.push(
      or(
        eq(hubProject.githubConnectedUserId, ctx.session.user.id),
        ownedAgency,
        ...collabConds
      )
    );
  }
  return and(...conds);
};
