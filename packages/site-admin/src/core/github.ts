/**
 * Octokit wrapper + repo reads. Ports of the hub engine's
 * packages/trpc/src/lib/cms/octokit.ts and the v2 read from
 * routers/cms/entries.ts::getContent — decoupled from hub's DB/cache.
 */

import { Octokit } from "@octokit/rest";

import { createHttpError } from "./errors";

const getRetryAfter = (response: Response) => {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) return retryAfter;

  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  if (remaining !== "0" || !reset) return null;

  const resetSeconds = Number(reset);
  if (!Number.isFinite(resetSeconds)) return null;

  return String(Math.max(1, resetSeconds - Math.floor(Date.now() / 1000)));
};

const isGithubRateLimitResponse = (response: Response, message: string) => {
  if (response.status !== 403 && response.status !== 429) return false;

  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("rate limit") ||
    response.headers.get("x-ratelimit-remaining") === "0" ||
    Boolean(response.headers.get("retry-after"))
  );
};

export const createOctokit = (token: string): Octokit => {
  if (!token) throw new Error("Auth token is required to initialize Octokit");

  return new Octokit({
    auth: token,
    request: {
      fetch: async (url: string, options: RequestInit) => {
        const response = await fetch(url, options);

        if (
          response.status === 401 ||
          response.status === 403 ||
          response.status === 429
        ) {
          let message =
            response.status === 401
              ? "GitHub authentication failed."
              : "GitHub request failed.";

          try {
            const data = await response.clone().json();
            if (typeof data.message === "string") {
              message = data.message;
            }
            if (response.status === 401 && data.message === "Bad credentials") {
              message = "GitHub authentication failed: bad credentials.";
            }
          } catch {}

          if (response.status === 401) {
            throw createHttpError(message, 401);
          }

          if (isGithubRateLimitResponse(response, message)) {
            const retryAfter = getRetryAfter(response);
            throw createHttpError(
              retryAfter
                ? `GitHub rate limit reached. Please wait ${retryAfter} seconds and try again.`
                : "GitHub rate limit reached. Please wait a minute and try again.",
              429,
              retryAfter ? { "Retry-After": retryAfter } : undefined
            );
          }
        }

        return response;
      },
    },
  });
};

/**
 * Verify the signed-in user can push to the repo, and resolve the branch.
 * One API call: GET /repos/{owner}/{repo} includes the authenticated user's
 * `permissions` and the repo's `default_branch`.
 */
export const checkRepoAccess = async (
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ defaultBranch: string }> => {
  let data;
  try {
    ({ data } = await octokit.rest.repos.get({ owner, repo }));
  } catch (error: any) {
    if (error.status === 404) {
      // GitHub returns 404 (not 403) for repos the token can't see.
      throw createHttpError(
        `You don't have access to ${owner}/${repo}. Ask the site owner to add your GitHub account as a repository collaborator.`,
        403
      );
    }
    throw error;
  }

  const permissions = data.permissions;
  const canPush = Boolean(
    permissions && (permissions.push || permissions.admin || permissions.maintain)
  );
  if (!canPush) {
    throw createHttpError(
      `Your GitHub account has read-only access to ${owner}/${repo}. Write access is required to edit this site.`,
      403
    );
  }

  return { defaultBranch: data.default_branch };
};

/** Base64 → utf8 that also works on edge runtimes without Buffer. */
const decodeBase64 = (b64: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const binary = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Read a repo file and parse it as JSON. Returns null when it doesn't exist. */
export const readJsonFile = async (
  octokit: Octokit,
  {
    owner,
    repo,
    branch,
    path,
  }: { owner: string; repo: string; branch: string; path: string }
): Promise<{ sha: string; contentObject: unknown } | null> => {
  let response;
  try {
    response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
  } catch (error: any) {
    if (error.status === 404) return null;
    throw error;
  }

  if (Array.isArray(response.data) || response.data.type !== "file") {
    throw createHttpError(
      `Expected a file at "${path}" but found something else.`,
      400
    );
  }

  const raw = decodeBase64(response.data.content);
  let contentObject: unknown;
  try {
    contentObject = JSON.parse(raw);
  } catch {
    throw createHttpError(`"${path}" is not valid JSON.`, 400);
  }

  return { sha: response.data.sha, contentObject };
};
