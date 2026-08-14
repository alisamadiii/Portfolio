import { and, eq } from "drizzle-orm";
import z from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { requireAdminRepoAccess } from "@workspace/trpc/lib/cms/authz";
import { collaboratorTable, db } from "@workspace/trpc/lib/cms/db";
import { runCms } from "@workspace/trpc/lib/cms/errors";

/**
 * Fetches collaborators for a repository.
 * Port of GET /api/collaborators/[owner]/[repo].
 * Only accessible to GitHub users (not collaborators).
 */
const list = authenticatedProcedure
  .input(z.object({ owner: z.string(), repo: z.string() }))
  .query(async ({ input, ctx }) =>
    runCms(async () => {
      // TODO: support for branches and account collaborators
      const { repoAccess } = await requireAdminRepoAccess(
        ctx.session.user,
        input.owner,
        input.repo,
        "Only GitHub users can manage collaborators."
      );

      return db.query.cmsCollaborator.findMany({
        where: and(
          eq(collaboratorTable.ownerId, repoAccess.ownerId),
          eq(collaboratorTable.repoId, repoAccess.repoId)
        ),
      });
    })
  );

const collaboratorsRouter = createTRPCRouter({
  list,
});

export { collaboratorsRouter };
