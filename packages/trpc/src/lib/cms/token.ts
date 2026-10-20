/**
 * Token helper functions.
 *
 * Authorization stays local: admins access every repo, the user who imported a
 * project (githubConnectedUserId) gets full access to it, and everyone else
 * needs a collaborator row. The GitHub token is always the GitHub App's
 * installation token ("Ali Samadi App") — the app must be installed on the
 * repo, or the hub shows the install overlay. Nobody needs a personal GitHub
 * token; commits pass the editing user as git author where applicable.
 */

import { cache } from "react";

import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { hubProject, type CollaboratorRole } from "@workspace/drizzle/schema";

import {
  getInstallationTokenForRepo,
  isGithubAppConfigured,
} from "@workspace/trpc/lib/github-app";
import { isAdminUser } from "../authz-shared";
import { collaboratorMatchesUserForRepoId } from "./collaborator-access";
import { db } from "./db";
import { createHttpError } from "./errors";

// Get a token for a user: role is decided first (DB-only), then the GitHub
// App's installation token is minted for the repo. PRECONDITION_FAILED means
// "the app isn't installed here" — the canvas layout routes it to the
// install-app overlay. Transient GitHub failures propagate as-is so a blip
// never masquerades as a missing installation.
const getToken = cache(
  async (
    user: { id: string; email: string; role?: string | null },
    repoId: number
  ) => {
    // repoId is the project's stable, globally-unique identity. owner/repo are
    // derived from the row (display + GitHub REST), never used to decide access.
    const [project] = await db
      .select({
        owner: hubProject.owner,
        repo: hubProject.repo,
        source: hubProject.source,
        githubConnectedUserId: hubProject.githubConnectedUserId,
      })
      .from(hubProject)
      .where(and(eq(hubProject.repoId, repoId), eq(hubProject.hidden, false)))
      .limit(1);

    // No visible row = the project was deleted from the hub (tombstoned) or
    // never imported. Say so precisely — without this guard the empty
    // owner/repo would surface as a bogus "app not installed" error.
    if (!project) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "This project was deleted from the hub or has not been imported yet. Import the repository to restore it.",
      });
    }

    const owner = project.owner;
    const repo = project.repo;

    // Role first — pure DB authorization, independent of GitHub.
    let role: CollaboratorRole;
    if (isAdminUser(user) || project.githubConnectedUserId === user.id) {
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

    // Uploaded projects have no GitHub repo and therefore no token. Role logic
    // above still applies; GitHub-only procedures must call requireGithubToken
    // (init.ts) which turns the null into a clear PRECONDITION_FAILED.
    if (project.source === "upload") {
      return { token: null, source: "upload" as const, role, owner, repo };
    }

    // Token second: always the installation token.
    if (!isGithubAppConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The GitHub App is not configured on this server.",
      });
    }
    const token = await getInstallationTokenForRepo(owner, repo);
    if (!token) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `The GitHub App is not installed on "${owner}/${repo}".`,
      });
    }
    return { token, source: "installation" as const, role, owner, repo };
  }
);

export { getToken };
