/**
 * Atomic multi-file commit via the Git Data API. Port of the hub engine's
 * packages/trpc/src/lib/cms/git-commit.ts with the hub-DB file cache stripped
 * — this package has no database. One tree, one commit, non-forced ref update;
 * conflict detection compares each file's base blob sha against the branch
 * tree before anything is written.
 */

import type { Octokit } from "@octokit/rest";

import { createHttpError } from "./errors";

type CommitFileInput = {
  path: string;
  sha: string | null;
  isNew: boolean;
  stringified: string;
};

type CommitFilesResult =
  | { status: "conflict"; stalePaths: string[]; conflictPaths: string[] }
  | {
      status: "success";
      commitSha: string;
      files: Array<{ path: string; sha: string }>;
    };

export async function commitFilesAtomic({
  octokit,
  owner,
  repo,
  branch,
  files,
  message,
  force = false,
}: {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
  files: CommitFileInput[];
  message: string;
  force?: boolean;
}): Promise<CommitFilesResult> {
  // Current branch head and its tree.
  const refResponse = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const headSha = refResponse.data.object.sha;

  const headCommitResponse = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: headSha,
  });
  const baseTreeSha = headCommitResponse.data.tree.sha;

  // Conflict check: compare each draft's base sha against the branch tree.
  const stalePaths: string[] = [];
  const conflictPaths: string[] = [];

  const baseTreeResponse = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: baseTreeSha,
    recursive: "1",
  });

  if (baseTreeResponse.data.truncated) {
    // Tree too large to list — fall back to per-file HEAD sha checks.
    for (const entry of files) {
      try {
        const response = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: entry.path,
          ref: branch,
        });
        if (Array.isArray(response.data))
          throw new Error(
            `Expected a file at "${entry.path}" but found a directory.`
          );
        if (entry.isNew) {
          conflictPaths.push(entry.path);
        } else if (response.data.sha !== entry.sha) {
          stalePaths.push(entry.path);
        }
      } catch (error: any) {
        if (error.status === 404) {
          // Missing on GitHub: fine for new files, stale for existing ones.
          if (!entry.isNew) stalePaths.push(entry.path);
        } else {
          throw error;
        }
      }
    }
  } else {
    const blobShaByPath = new Map<string, string>();
    for (const item of baseTreeResponse.data.tree) {
      if (item.type === "blob" && item.path && item.sha)
        blobShaByPath.set(item.path, item.sha);
    }
    for (const entry of files) {
      const currentSha = blobShaByPath.get(entry.path);
      if (entry.isNew) {
        if (currentSha) conflictPaths.push(entry.path);
      } else if (currentSha !== entry.sha) {
        stalePaths.push(entry.path);
      }
    }
  }

  if ((stalePaths.length > 0 || conflictPaths.length > 0) && !force) {
    return { status: "conflict", stalePaths, conflictPaths };
  }

  // One tree, one commit for all files (inline content — no createBlob).
  const newTreeResponse = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: files.map((entry) => ({
      path: entry.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: entry.stringified,
    })),
  });

  const newCommitResponse = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: newTreeResponse.data.sha,
    parents: [headSha],
  });
  const newCommitSha = newCommitResponse.data.sha;

  try {
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitSha,
      force: false,
    });
  } catch (error: any) {
    if (error.status === 422) {
      // Branch advanced between getRef and updateRef — nothing was lost.
      throw createHttpError(
        "Branch was updated while saving — please retry.",
        409
      );
    }
    throw error;
  }

  // Fetch the new tree to get the blob shas of the committed files.
  const publishedTreeResponse = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: newCommitResponse.data.tree.sha,
    recursive: "1",
  });
  const publishedShaByPath = new Map<string, string>();
  for (const item of publishedTreeResponse.data.tree) {
    if (item.type === "blob" && item.path && item.sha)
      publishedShaByPath.set(item.path, item.sha);
  }

  const publishedFiles: Array<{ path: string; sha: string }> = [];
  for (const entry of files) {
    const sha = publishedShaByPath.get(entry.path);
    if (sha) publishedFiles.push({ path: entry.path, sha });
  }

  return { status: "success", commitSha: newCommitSha, files: publishedFiles };
}

export type { CommitFileInput, CommitFilesResult };
