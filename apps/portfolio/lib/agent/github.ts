const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const BASE = "https://api.github.com";

function headers() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function readFile(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<{ content: string; sha: string }> {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Failed to read ${path}: ${res.statusText}`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

export async function editFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  branch: string,
  message: string
): Promise<void> {
  // Get current file SHA (needed for updates)
  let sha: string | undefined;
  try {
    const existing = await readFile(owner, repo, path, branch);
    sha = existing.sha;
  } catch {
    // File doesn't exist yet — creating new
  }

  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to edit ${path}: ${err}`);
  }
}

export async function listFiles(
  owner: string,
  repo: string,
  directory: string,
  branch: string
): Promise<string[]> {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/contents/${directory}?ref=${branch}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Failed to list ${directory}: ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [data.path];
  return data.map((item: { path: string }) => item.path);
}

export async function mergeBranch(
  owner: string,
  repo: string,
  head: string,
  base: string
): Promise<void> {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/merges`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      base,
      head,
      commit_message: `Merge ${head} into ${base} — client approved changes`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to merge ${head} into ${base}: ${err}`);
  }
}

export async function resetBranch(
  owner: string,
  repo: string,
  branch: string,
  sha: string
): Promise<void> {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ sha, force: true }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to reset ${branch}: ${err}`);
  }
}

// --- WebContainer integration ---

interface GitTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export async function getRepoTree(
  owner: string,
  repo: string,
  branch: string
): Promise<GitTreeEntry[]> {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Failed to get repo tree: ${res.statusText}`);
  const data = await res.json();
  return data.tree as GitTreeEntry[];
}

/**
 * Fetch repo files and return them in WebContainer FileSystemTree format.
 * Skips node_modules, .git, .next, .turbo, and binary files.
 */
export async function getRepoFiles(
  owner: string,
  repo: string,
  branch: string
): Promise<Record<string, unknown>> {
  const tree = await getRepoTree(owner, repo, branch);

  const SKIP_DIRS = [
    "node_modules",
    ".git",
    ".next",
    ".turbo",
    ".vercel",
    "dist",
    "build",
  ];
  const SKIP_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".webm",
    ".mp3",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
  ];

  const blobs = tree.filter((entry) => {
    if (entry.type !== "blob") return false;
    if (SKIP_DIRS.some((dir) => entry.path.startsWith(dir + "/"))) return false;
    if (SKIP_EXTENSIONS.some((ext) => entry.path.endsWith(ext))) return false;
    return true;
  });

  // Fetch file contents in parallel (batched)
  const BATCH_SIZE = 20;
  const fileContents: { path: string; content: string }[] = [];

  for (let i = 0; i < blobs.length; i += BATCH_SIZE) {
    const batch = blobs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (entry) => {
        try {
          const { content } = await readFile(owner, repo, entry.path, branch);
          return { path: entry.path, content };
        } catch {
          return null;
        }
      })
    );
    for (const r of results) {
      if (r) fileContents.push(r);
    }
  }

  // Build WebContainer FileSystemTree
  const fsTree: Record<string, unknown> = {};

  for (const file of fileContents) {
    const parts = file.path.split("/");
    let current = fsTree;

    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      if (!current[dirName]) {
        current[dirName] = { directory: {} };
      }
      current = (current[dirName] as { directory: Record<string, unknown> })
        .directory;
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = {
      file: { contents: file.content },
    };
  }

  return fsTree;
}

/**
 * Commit multiple files atomically using Git Trees + Commits API.
 */
export async function commitMultipleFiles(
  owner: string,
  repo: string,
  branch: string,
  files: { path: string; content: string }[],
  message: string
): Promise<string> {
  // 1. Get current branch SHA
  const branchSha = await getBranchSha(owner, repo, branch);

  // 2. Get tree SHA from current commit
  const commitRes = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/commits/${branchSha}`,
    { headers: headers() }
  );
  if (!commitRes.ok) throw new Error("Failed to get commit");
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const treeEntries = await Promise.all(
    files.map(async (file) => {
      const blobRes = await fetch(
        `${BASE}/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            content: file.content,
            encoding: "utf-8",
          }),
        }
      );
      if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.path}`);
      const blobData = await blobRes.json();

      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.sha,
      };
    })
  );

  // 4. Create new tree
  const treeRes = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    }
  );
  if (!treeRes.ok) throw new Error("Failed to create tree");
  const treeData = await treeRes.json();

  // 5. Create new commit
  const newCommitRes = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [branchSha],
      }),
    }
  );
  if (!newCommitRes.ok) throw new Error("Failed to create commit");
  const newCommitData = await newCommitRes.json();

  // 6. Update branch ref
  const refRes = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ sha: newCommitData.sha }),
    }
  );
  if (!refRes.ok) throw new Error("Failed to update branch ref");

  return newCommitData.sha;
}

export async function getBranchSha(
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const res = await fetch(
    `${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Failed to get SHA for ${branch}`);
  const data = await res.json();
  return data.object.sha;
}
