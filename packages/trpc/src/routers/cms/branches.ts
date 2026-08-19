import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  cmsProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { assertFullAccess } from "@workspace/trpc/lib/cms/authz";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";
import { createOctokitInstance } from "@workspace/trpc/lib/cms/octokit";

/**
 * Creates a new branch in a GitHub repository.
 * Port of POST /api/[owner]/[repo]/[branch]/branches (body: { name }).
 */
const create = cmsProcedure
  .input(
    z.object({
      branch: z.string(),
      name: z.string().min(1, `"name" is required.`),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      assertFullAccess(ctx.role);

      const octokit = createOctokitInstance(ctx.token);

      // Get the SHA of the branch we're creating the new branch from
      const { data: refData } = await octokit.rest.git.getRef({
        owner: input.owner,
        repo: input.repo,
        ref: `heads/${input.branch}`,
      });
      const sha = refData.object.sha;

      // Create the new branch with the obtained SHA
      const response = await octokit.rest.git.createRef({
        owner: input.owner,
        repo: input.repo,
        ref: `refs/heads/${input.name}`,
        sha,
      });

      return {
        message: `Branch "${input.name}" created successfully from"${input.branch}".`,
        data: response.data,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  });

const branchesRouter = createTRPCRouter({
  create,
});

export { branchesRouter };
