import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { requireCollaboratorManageAccess } from "@workspace/trpc/lib/cms/authz";
import { collaboratorTable, db } from "@workspace/trpc/lib/cms/db";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";

/**
 * Fetches collaborators for a repository.
 * Port of GET /api/collaborators/[owner]/[repo].
 * Accessible to admins and full-access collaborators.
 */
const list = authenticatedProcedure
  .input(z.object({ owner: z.string(), repo: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      // TODO: support for branches and account collaborators
      const { repoAccess } = await requireCollaboratorManageAccess(
        ctx.session.user,
        input.owner,
        input.repo
      );

      return db.query.hubCollaborator.findMany({
        where: eq(collaboratorTable.repoId, repoAccess.repoId),
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

const collaboratorsRouter = createTRPCRouter({
  list,
});

export { collaboratorsRouter };
