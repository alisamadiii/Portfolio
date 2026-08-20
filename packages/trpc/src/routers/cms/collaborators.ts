import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  collaboratorManageProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { collaboratorTable, db } from "@workspace/trpc/lib/cms/db";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";

export const collaboratorsRouter = createTRPCRouter({
  /**
   * Fetches collaborators for a repository.
   * Port of GET /api/collaborators/[owner]/[repo].
   * Accessible to admins and full-access collaborators.
   */
  list: collaboratorManageProcedure.query(async ({ ctx }) => {
    try {
      // TODO: support for branches and account collaborators
      return db.query.hubCollaborator.findMany({
        where: eq(collaboratorTable.repoId, ctx.repoAccess.repoId),
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),
});
