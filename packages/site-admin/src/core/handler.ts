/**
 * The admin API as one framework-agnostic handler: Web Request in, Web
 * Response out. Adapters (/astro, /next) only read env and forward.
 *
 * Routes (relative to basePath, default "/api/admin"):
 *   GET  /manifest        → cms.json + resolved repo/branch
 *   GET  /content?path=   → { path, sha, contentObject } for one data file
 *   POST /content         → save: serialize + atomic commit with the USER's token
 *
 * Every request: Clerk auth → user's GitHub token → repo write-access check.
 */

import { authenticate } from "./auth";
import { commitFilesAtomic } from "./commit";
import { createHttpError, toErrorResponse } from "./errors";
import { checkRepoAccess, createOctokit, readJsonFile } from "./github";
import type { AdminConfig, CmsManifest, SaveRequestBody } from "./types";

const MANIFEST_PATH = "src/data/cms.json";

/** Only the contract's data files are editable — hygiene, not security (the
 * user's own token gates real access). */
const EDITABLE_PATH = /^src\/(data|content)\/[A-Za-z0-9._/-]+\.json$/;

const isEditablePath = (path: string): boolean =>
  EDITABLE_PATH.test(path) && !path.includes("..");

const parseRepo = (repo: string): { owner: string; name: string } => {
  const [owner, name, ...rest] = repo.split("/");
  if (!owner || !name || rest.length > 0) {
    throw createHttpError(
      `Invalid repo "${repo}" — expected "owner/name".`,
      500
    );
  }
  return { owner, name };
};

export const createAdminHandler = (config: AdminConfig) => {
  const { owner, name: repoName } = parseRepo(config.repo);
  const basePath = (config.basePath ?? "/api/admin").replace(/\/+$/, "");

  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (!url.pathname.startsWith(basePath)) {
        throw createHttpError("Not found.", 404);
      }
      const route = url.pathname.slice(basePath.length).replace(/^\/+/, "");

      const { githubToken } = await authenticate(request, config);
      const octokit = createOctokit(githubToken);
      const { defaultBranch } = await checkRepoAccess(octokit, owner, repoName);
      const branch = config.branch ?? defaultBranch;

      if (request.method === "GET" && route === "manifest") {
        const file = await readJsonFile(octokit, {
          owner,
          repo: repoName,
          branch,
          path: MANIFEST_PATH,
        });
        if (!file) {
          throw createHttpError(
            `${MANIFEST_PATH} not found — this repo isn't set up for the CMS.`,
            404
          );
        }
        return Response.json({
          manifest: file.contentObject as CmsManifest,
          repo: config.repo,
          branch,
        });
      }

      if (request.method === "GET" && route === "content") {
        const path = url.searchParams.get("path") ?? "";
        if (!isEditablePath(path)) {
          throw createHttpError(`Invalid content path "${path}".`, 400);
        }
        const file = await readJsonFile(octokit, {
          owner,
          repo: repoName,
          branch,
          path,
        });
        if (!file) throw createHttpError(`"${path}" not found.`, 404);
        return Response.json({ path, ...file });
      }

      if (request.method === "POST" && route === "content") {
        const body = (await request.json()) as SaveRequestBody;
        if (!isEditablePath(body.path ?? "")) {
          throw createHttpError(`Invalid content path "${body.path}".`, 400);
        }
        if (body.contentObject === undefined) {
          throw createHttpError("contentObject is required.", 400);
        }

        const stringified = `${JSON.stringify(body.contentObject, null, 2)}\n`;
        const result = await commitFilesAtomic({
          octokit,
          owner,
          repo: repoName,
          branch,
          files: [
            {
              path: body.path,
              sha: body.sha,
              isNew: body.sha === null,
              stringified,
            },
          ],
          message: body.message ?? `content: update ${body.path}`,
          force: body.force ?? false,
        });

        if (result.status === "conflict") {
          return Response.json({ status: "conflict" }, { status: 409 });
        }
        return Response.json({
          status: "success",
          commitSha: result.commitSha,
          sha: result.files[0]?.sha ?? null,
        });
      }

      throw createHttpError("Not found.", 404);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
};
