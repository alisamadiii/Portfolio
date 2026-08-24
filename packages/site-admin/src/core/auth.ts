/**
 * Clerk authentication for the admin API. The signed-in user's own GitHub
 * OAuth token (Clerk GitHub provider, `repo` scope) is what authors every
 * commit — there is no server-held GitHub credential anywhere.
 */

import { createClerkClient } from "@clerk/backend";

import { createHttpError } from "./errors";

export type AuthedUser = {
  userId: string;
  /** The user's GitHub OAuth access token, fresh from Clerk. */
  githubToken: string;
};

export const authenticate = async (
  request: Request,
  config: { clerkSecretKey: string; clerkPublishableKey: string }
): Promise<AuthedUser> => {
  const clerk = createClerkClient({
    secretKey: config.clerkSecretKey,
    publishableKey: config.clerkPublishableKey,
  });

  const requestState = await clerk.authenticateRequest(request);
  if (!requestState.isSignedIn) {
    throw createHttpError("Not signed in.", 401);
  }

  const { userId } = requestState.toAuth();
  if (!userId) throw createHttpError("Not signed in.", 401);

  // Clerk stores + refreshes the OAuth token; we just ask for the current one.
  const tokens = await clerk.users.getUserOauthAccessToken(
    userId,
    "oauth_github"
  );
  const githubToken = tokens.data[0]?.token;
  if (!githubToken) {
    throw createHttpError(
      "No GitHub account connected. Sign in with GitHub to edit this site.",
      403
    );
  }

  return { userId, githubToken };
};
