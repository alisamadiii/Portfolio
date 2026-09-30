/**
 * Token helper functions.
 *
 * Authorization stays local: admins access every repo, the user who connected
 * GitHub for a project gets full access to it, and everyone else needs a
 * collaborator row. The GitHub token depends on the role: editing roles
 * (admin / owner / full-access / content-editor) must have their own GitHub
 * connected so commits are attributed to them; view-only collaborators need no
 * GitHub at all — their reads ride the project owner's stored token.
 */

import { cache } from "react";

import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { hubProject, type CollaboratorRole } from "@workspace/drizzle/schema";

import { getIntegrationAccessToken } from "@workspace/trpc/lib/integrations";
import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForRepoId } from "./collaborator-access";
import { db } from "./db";
import { createHttpError } from "./errors";

const isReconnectError = (err: unknown) =>
  err instanceof TRPCError && err.code === "PRECONDITION_FAILED";

// Get a token for a user: role is decided first (DB-only), then the token is
// resolved to match — the caller's own GitHub for editing roles, with a
// fallback to the project owner's token for view-only collaborators.
const getToken = cache(
  async (
    user: { id: string; email: string; role?: string | null },
    repoId: number,
    _verifyGithubAccess: boolean = false
  ) => {
    // repoId is the project's stable, globally-unique identity. owner/repo are
    // derived from the row (display + GitHub REST), never used to decide access.
    const [project] = await db
      .select({
        owner: hubProject.owner,
        repo: hubProject.repo,
        githubConnectedUserId: hubProject.githubConnectedUserId,
      })
      .from(hubProject)
      .where(and(eq(hubProject.repoId, repoId), eq(hubProject.hidden, false)))
      .limit(1);

    const owner = project?.owner ?? "";
    const repo = project?.repo ?? "";

    // Role first — pure DB authorization, independent of GitHub.
    let role: CollaboratorRole;
    if (isAdminUser(user) || project?.githubConnectedUserId === user.id) {
      role = "full-access";
    } else {
      const permission = await db.query.hubCollaborator.findFirst({
        where: collaboratorMatchesUserForRepoId(user, repoId),
      });
      if (!permission) {
        throw createHttpError(
          `You do not have permission to access "${owner}/${repo}".`,
          403
        );
      }
      role = permission.role;
    }

    // Token second. Editing roles must bring their own GitHub (commits are
    // attributed to them); viewers fall back to the project owner's token.
    try {
      const token = await getIntegrationAccessToken(user.id, "github", "GitHub");
      return { token, source: "user" as const, role, owner, repo };
    } catch (err) {
      if (!isReconnectError(err) || role !== "view-only") throw err;
    }

    const ownerId = project?.githubConnectedUserId;
    if (ownerId) {
      try {
        const token = await getIntegrationAccessToken(ownerId, "github", "GitHub");
        return { token, source: "owner" as const, role, owner, repo };
      } catch {
        // fall through to the owner-directed error below
      }
    }
    throw createHttpError(
      "The project owner's GitHub connection needs to be refreshed before this project can load.",
      422
    );
  }
);

export { getToken };
