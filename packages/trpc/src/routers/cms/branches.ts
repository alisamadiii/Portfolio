import z from "zod";

import {
  authenticatedProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { createHttpError, runCms } from "@workspace/trpc/lib/cms/errors";
import { createOctokitInstance } from "@workspace/trpc/lib/cms/octokit";
import { toCmsUser } from "@workspace/trpc/lib/cms/session-user";
import { getToken } from "@workspace/trpc/lib/cms/token";

/**
 * Creates a new branch in a GitHub repository.
 * Port of POST /api/[owner]/[repo]/[branch]/branches (body: { name }).
 */
const create = authenticatedProcedure
  .input(
    z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string(),
      name: z.string().min(1, `"name" is required.`),
    })
  )
  .mutation(async ({ input, ctx }) =>
    runCms(async () => {
      const user = toCmsUser(ctx.session.user);

      const { token } = await getToken(user, input.owner, input.repo, true);
      if (!token) throw createHttpError("Token not found", 401);

      const octokit = createOctokitInstance(token);

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
    })
  );

const branchesRouter = createTRPCRouter({
  create,
});

export { branchesRouter };
