import { createHttpError, toErrorResponse } from "@/lib/api-error";
import {
  buildCommitTokens,
  resolveCommitIdentity,
  resolveCommitMessage,
} from "@/lib/commit-message";
import { getConfig } from "@/lib/config-store";
import {
  getBranchHeadSha,
  getCollectionCache,
  setBranchHeadSha,
  updateFileCache,
} from "@/lib/github-cache-file";
import { requireFeatureAccess } from "@/lib/feature-access";
import { getFieldByPath, getSchemaByName, safeAccess } from "@/lib/schema";
import { parse, stringify } from "@/lib/serialization";
import { requireApiUserSession } from "@/lib/session-server";
import { getToken } from "@/lib/token";
import {
  getFileExtension,
  getParentPath,
  normalizePath,
  serializedTypes,
} from "@/lib/utils/file";
import { createOctokitInstance } from "@/lib/utils/octokit";

/**
 * Reorders a collection's entries by rewriting the collection's order field
 * (`view.reorder`) in every entry whose value changed, in a single commit.
 *
 * POST /api/[owner]/[repo]/[branch]/collections/[name]/reorder
 *
 * Body: { path: string, items: [{ path: string, sha: string, value: number }] }
 *
 * Requires authentication.
 */

const setByPath = (target: Record<string, any>, path: string, value: any) => {
  if (!path) return;
  const segments = path.split(".");
  let cursor: Record<string, any> = target;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (
      cursor[key] == null ||
      typeof cursor[key] !== "object" ||
      Array.isArray(cursor[key])
    ) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[segments[segments.length - 1]] = value;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      owner: string;
      repo: string;
      branch: string;
      name: string;
    }>;
  }
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    await requireFeatureAccess(user, "cms");

    const { token } = await getToken(user, params.owner, params.repo, true);
    if (!token) throw new Error("Token not found");

    const config = await getConfig(params.owner, params.repo, params.branch, {
      getToken: async () => token,
    });
    if (!config)
      throw new Error(
        `Configuration not found for ${params.owner}/${params.repo}/${params.branch}.`
      );

    const schema = getSchemaByName(config.object, params.name);
    if (!schema)
      throw new Error(`Content schema not found for ${params.name}.`);
    if (schema.type !== "collection")
      throw createHttpError(
        `Reordering is only available for collections.`,
        400
      );

    const orderField = schema.view?.reorder;
    if (!orderField || typeof orderField !== "string")
      throw createHttpError(
        `Reordering isn't configured for "${params.name}" (set "view.reorder").`,
        400
      );
    const orderFieldSchema = getFieldByPath(schema.fields, orderField);
    if (!orderFieldSchema || orderFieldSchema.type !== "number")
      throw createHttpError(
        `"view.reorder" must reference a number field ("${orderField}" isn't one).`,
        400
      );
    if (!serializedTypes.includes(schema.format) || schema.format === "raw")
      throw createHttpError(
        `Reordering isn't supported for the "${schema.format}" format.`,
        400
      );

    const data: any = await request.json();

    if (!data.path || typeof data.path !== "string")
      throw new Error(`"path" is required.`);
    if (!Array.isArray(data.items) || data.items.length === 0)
      throw new Error(`"items" is required and must be a non-empty array.`);

    const normalizedDirPath = normalizePath(data.path);
    if (
      normalizedDirPath !== schema.path &&
      !normalizedDirPath.startsWith(`${schema.path}/`)
    )
      throw new Error(
        `Invalid path "${data.path}" for collection "${params.name}".`
      );

    const seenPaths = new Set<string>();
    const seenValues = new Set<number>();
    const items: { path: string; sha: string; value: number }[] =
      data.items.map((item: any) => {
        if (!item || typeof item.path !== "string")
          throw new Error(`Each item must have a "path".`);
        const itemPath = normalizePath(item.path);
        if (getParentPath(itemPath) !== normalizedDirPath)
          throw new Error(
            `Invalid item path "${item.path}": reordering is limited to "${normalizedDirPath}".`
          );
        if (getFileExtension(itemPath) !== (schema.extension ?? ""))
          throw new Error(
            `Invalid extension for "${item.path}" in collection "${params.name}".`
          );
        if (
          typeof item.value !== "number" ||
          !Number.isInteger(item.value) ||
          item.value < 0
        )
          throw new Error(
            `Invalid order value for "${item.path}": must be a non-negative integer.`
          );
        if (seenPaths.has(itemPath))
          throw new Error(`Duplicate item path "${item.path}".`);
        if (seenValues.has(item.value))
          throw new Error(`Duplicate order value ${item.value}.`);
        seenPaths.add(itemPath);
        seenValues.add(item.value);

        return { path: itemPath, sha: item.sha, value: item.value };
      });

    const entries = await getCollectionCache(
      params.owner,
      params.repo,
      params.branch,
      normalizedDirPath,
      token,
      schema.view?.node?.filename
    );
    const entryByPath = new Map(
      entries
        .filter((entry: any) => entry.type === "file")
        .map((entry: any) => [entry.path, entry])
    );

    const changes: { path: string; content: string; value: number }[] = [];
    for (const item of items) {
      const entry: any = entryByPath.get(item.path);
      if (!entry || entry.content == null)
        throw createHttpError(`File "${item.path}" not found.`, 404);
      if (item.sha && entry.sha && item.sha !== entry.sha)
        throw createHttpError(
          `Entries changed since you loaded them. Refresh and try again.`,
          409
        );

      const parsed =
        parse(entry.content, {
          format: schema.format,
          delimiters: schema.delimiters,
        }) ?? {};
      const currentValue = safeAccess(parsed, orderField);
      if (Number(currentValue) === item.value) continue;

      setByPath(parsed, orderField, item.value);
      changes.push({
        path: item.path,
        content: stringify(parsed, {
          format: schema.format,
          delimiters: schema.delimiters,
        }),
        value: item.value,
      });
    }

    if (changes.length === 0) {
      return Response.json({
        status: "success",
        message: "Nothing to reorder.",
        data: { commitSha: null, updated: [] },
      });
    }

    const commitIdentity = resolveCommitIdentity({
      configObject: config.object,
      identityOverride: schema?.commit?.identity,
    });
    const editorName =
      commitIdentity === "user" ? user.name?.trim() || user.email : undefined;

    const resolvedMessage = resolveCommitMessage({
      configObject: config.object,
      templatesOverride: schema?.commit?.templates,
      action: "reorder",
      tokens: buildCommitTokens({
        action: "reorder",
        owner: params.owner,
        repo: params.repo,
        branch: params.branch,
        path: normalizedDirPath,
        contentName: params.name,
        user: user.email || user.name || String(user.id || ""),
        userName: editorName,
      }),
    });

    const octokit = createOctokitInstance(token);
    const currentSha = await getBranchHeadSha(
      params.owner,
      params.repo,
      params.branch,
      token
    );

    const blobEntries = await Promise.all(
      changes.map(async (change) => {
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner: params.owner,
          repo: params.repo,
          content: change.content,
          encoding: "utf-8",
        });
        return {
          path: change.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blobData.sha,
        };
      })
    );

    const { data: newTreeData } = await octokit.rest.git.createTree({
      owner: params.owner,
      repo: params.repo,
      base_tree: currentSha,
      tree: blobEntries,
    });

    const { data: commitData } = await octokit.rest.git.createCommit({
      owner: params.owner,
      repo: params.repo,
      message: editorName
        ? `${resolvedMessage} — by ${editorName}`
        : resolvedMessage,
      tree: newTreeData.sha,
      parents: [currentSha],
    });
    const commitSha = commitData.sha;

    try {
      await octokit.rest.git.updateRef({
        owner: params.owner,
        repo: params.repo,
        ref: `heads/${params.branch}`,
        sha: commitSha,
      });
    } catch (error: any) {
      if (error?.status === 422)
        throw createHttpError(
          `The branch changed while saving the new order. Refresh and try again.`,
          409
        );
      throw error;
    }
    setBranchHeadSha(params.owner, params.repo, params.branch, commitSha);

    const blobShaByPath = new Map(
      blobEntries.map((entry) => [entry.path, entry.sha])
    );
    const updated = changes.map((change) => ({
      path: change.path,
      sha: blobShaByPath.get(change.path) ?? null,
      value: change.value,
    }));

    for (const change of changes) {
      await updateFileCache(
        "collection",
        params.owner,
        params.repo,
        params.branch,
        {
          type: "modify",
          path: change.path,
          sha: blobShaByPath.get(change.path) ?? undefined,
          content: change.content,
          size: Buffer.byteLength(change.content),
          commit: {
            sha: commitSha,
            timestamp: Date.now(),
          },
        }
      );
    }

    return Response.json({
      status: "success",
      message: `Reordered ${changes.length} ${changes.length === 1 ? "entry" : "entries"}.`,
      data: { commitSha, updated },
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}
