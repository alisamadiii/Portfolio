import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject, projectOffers } from "@workspace/drizzle/schema";

import { getImport, pushBackup } from "./content-pilot";

// Upload projects' source lives in a private GitHub org. The hub owns the
// repos (creates, links, archives); content-pilot only pushes main to the
// repo the hub names on publish/replace (pilot src/worker/backup.ts).
// GITHUB_BACKUP_TOKEN: fine-grained PAT on the org, Administration RW +
// Contents R. Pilot's own token only needs Contents RW.
export const isBackupConfigured = () =>
  Boolean(process.env.GITHUB_BACKUP_ORG && process.env.GITHUB_BACKUP_TOKEN);

const config = () => {
  const org = process.env.GITHUB_BACKUP_ORG;
  const token = process.env.GITHUB_BACKUP_TOKEN;
  if (!org || !token) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Source code backups aren't set up yet." });
  }
  return { org, token };
};

type GithubRepo = {
  id: number;
  name: string;
  html_url: string;
  default_branch: string;
  pushed_at: string | null;
  description: string | null;
  owner: { login: string };
};

export type BackupRepo = {
  id: number;
  name: string;
  url: string;
  pushedAt: string | null;
  description: string | null;
};

const toBackupRepo = (r: GithubRepo): BackupRepo => ({
  id: r.id,
  name: r.name,
  url: r.html_url,
  pushedAt: r.pushed_at,
  description: r.description,
});

async function github(path: string, token: string, init?: RequestInit) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function githubJson<T>(path: string, token: string): Promise<T | null> {
  const res = await github(path, token);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: `GitHub: ${res.status} ${res.statusText}` });
  }
  return (await res.json()) as T;
}

/** The project paid a client plan that includes "Website Setup" (they own the code). */
export async function hasWebsiteSetup(projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projectOffers.id })
    .from(projectOffers)
    .where(
      and(
        eq(projectOffers.projectId, projectId),
        eq(projectOffers.status, "paid"),
        sql`exists (select 1 from jsonb_array_elements(${projectOffers.items}) as item where lower(trim(item->>'name')) = 'website setup')`
      )
    )
    .limit(1);
  return Boolean(row);
}

/**
 * The project's backup repo, or null when none is linked. The GitHub id is
 * stored on hub_project; when it's missing, the repo pilot last pushed to
 * (older projects, from before the hub owned repos) is adopted and saved.
 */
export async function linkedBackupRepo(projectId: string): Promise<BackupRepo | null> {
  const { org, token } = config();
  const [project] = await db
    .select({ backupRepoId: hubProject.backupRepoId })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);

  if (project?.backupRepoId) {
    const repo = await githubJson<GithubRepo>(`/repositories/${project.backupRepoId}`, token);
    return repo ? toBackupRepo(repo) : null;
  }

  const backup = await getImport(projectId)
    .then((s) => s.backup)
    .catch(() => null);
  if (!backup?.repo) return null;
  const repo = await githubJson<GithubRepo>(`/repos/${org}/${backup.repo}`, token);
  if (!repo) return null;
  await db.update(hubProject).set({ backupRepoId: repo.id }).where(eq(hubProject.id, projectId));
  return toBackupRepo(repo);
}

export type BackupHead = {
  sha: string;
  message: string;
  authorName: string | null;
  authorLogin: string | null;
  authorAvatar: string | null;
  committedAt: string | null;
  url: string;
};

type GithubCommit = {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name?: string; date?: string } | null };
  author: { login: string; avatar_url: string } | null;
};

/**
 * The backup repo plus its latest commit on the default branch ("GitHub"
 * dialog on the project home). `head` is null for a repo nothing was pushed
 * to yet; the whole thing is null when no repo is linked.
 */
export async function backupRepoInfo(projectId: string): Promise<{
  repo: BackupRepo & { fullName: string; defaultBranch: string };
  head: BackupHead | null;
} | null> {
  const { org, token } = config();
  const linked = await linkedBackupRepo(projectId);
  if (!linked) return null;
  const full = await githubJson<GithubRepo>(`/repositories/${linked.id}`, token);
  const defaultBranch = full?.default_branch ?? "main";
  // 404 on an empty repo (no branch yet); 409 "Git Repository is empty" on some.
  const res = await github(
    `/repositories/${linked.id}/commits/${encodeURIComponent(defaultBranch)}`,
    token
  );
  let head: BackupHead | null = null;
  if (res.ok) {
    const c = (await res.json()) as GithubCommit;
    head = {
      sha: c.sha,
      message: c.commit.message,
      authorName: c.commit.author?.name ?? null,
      authorLogin: c.author?.login ?? null,
      authorAvatar: c.author?.avatar_url ?? null,
      committedAt: c.commit.author?.date ?? null,
      url: c.html_url,
    };
  } else if (res.status !== 404 && res.status !== 409) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: `GitHub: ${res.status} ${res.statusText}` });
  }
  return { repo: { ...linked, fullName: `${org}/${linked.name}`, defaultBranch }, head };
}

/** Every repo in the backup org, most recently pushed first (admin linking). */
export async function listBackupRepos(): Promise<BackupRepo[]> {
  const { org, token } = config();
  const repos: GithubRepo[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await githubJson<GithubRepo[]>(
      `/orgs/${org}/repos?type=all&sort=pushed&per_page=100&page=${page}`,
      token
    );
    if (!batch?.length) break;
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos.map(toBackupRepo);
}

/** Links a backup-org repo to the project. Only repos in the backup org. */
export async function linkBackupRepo(
  projectId: string,
  repoId: number
): Promise<BackupRepo & { pushed: boolean }> {
  const { org, token } = config();
  const repo = await githubJson<GithubRepo>(`/repositories/${repoId}`, token);
  if (!repo || repo.owner.login.toLowerCase() !== org.toLowerCase()) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That repository isn't in the backup organization." });
  }
  await db.update(hubProject).set({ backupRepoId: repo.id }).where(eq(hubProject.id, projectId));
  // Push the current main there now, so the download is never stale.
  const pushed = await pushBackup(projectId, repo.name).then(
    () => true,
    (error) => {
      console.error("[backup] push after link failed", error);
      return false;
    }
  );
  return { ...toBackupRepo(repo), pushed };
}

/** Repo-safe slug + the project id prefix: `acme-plumbing-1a2b3c4d`. */
const backupRepoName = (nameHint: string, projectId: string) => {
  const slug = nameHint
    .toLowerCase()
    .replace(/\.zip$/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "site"}-${projectId.slice(0, 8)}`;
};

/**
 * The project's backup repo, linking or creating one when needed: the linked
 * repo, else the one pilot already pushed to, else a new private repo in the
 * org. The repo description is the project id, so a retry after a crash
 * between "created" and "saved" adopts its own repo instead of duplicating.
 */
async function ensureBackupRepo(projectId: string): Promise<BackupRepo> {
  const linked = await linkedBackupRepo(projectId);
  if (linked) return linked;

  const { org, token } = config();
  const [project] = await db
    .select({ name: hubProject.name, repo: hubProject.repo })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  const base = backupRepoName(project?.name || project?.repo || "", projectId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const name = attempt ? `${base}-${attempt + 1}` : base;
    const res = await github(`/orgs/${org}/repos`, token, {
      method: "POST",
      body: JSON.stringify({
        name,
        private: true,
        description: projectId,
        auto_init: false,
        has_issues: false,
        has_projects: false,
        has_wiki: false,
      }),
    });
    let repo: GithubRepo | null = null;
    if (res.ok) {
      repo = (await res.json()) as GithubRepo;
    } else if (res.status === 422) {
      // Name taken. Ours (same project id) → adopt; anyone else's → next.
      const existing = await githubJson<GithubRepo>(`/repos/${org}/${name}`, token);
      if (existing?.description === projectId) repo = existing;
    } else {
      throw new TRPCError({ code: "BAD_GATEWAY", message: `GitHub repo create failed (${res.status}).` });
    }
    if (repo) {
      await db.update(hubProject).set({ backupRepoId: repo.id }).where(eq(hubProject.id, projectId));
      return toBackupRepo(repo);
    }
  }
  throw new TRPCError({ code: "CONFLICT", message: "Could not find a free repo name in the backup org." });
}

/**
 * Publish: the repo name pilot should push main to, or null (backups off or
 * GitHub failing). Never throws: a backup problem must not block a publish.
 */
export async function backupRepoForPublish(projectId: string): Promise<string | null> {
  if (!isBackupConfigured()) return null;
  try {
    return (await ensureBackupRepo(projectId)).name;
  } catch (error) {
    console.error("[backup] resolve repo for publish failed", error);
    return null;
  }
}

/** Replace source: push the new main now. Best effort, never throws. */
export async function backupNow(projectId: string): Promise<void> {
  const repo = await backupRepoForPublish(projectId);
  if (!repo) return;
  await pushBackup(projectId, repo).catch((error) => console.error("[backup] push failed", error));
}

/** Project deleted: archive (never delete) its backup repo. Best effort. */
export async function archiveBackupRepo(projectId: string): Promise<void> {
  if (!isBackupConfigured()) return;
  try {
    const { token } = config();
    const [project] = await db
      .select({ backupRepoId: hubProject.backupRepoId })
      .from(hubProject)
      .where(eq(hubProject.id, projectId))
      .limit(1);
    if (!project?.backupRepoId) return;
    await github(`/repositories/${project.backupRepoId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ archived: true }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("[backup] archive failed", error);
  }
}

/**
 * Short-lived download link for a zip of the project's code. GitHub answers
 * the zipball request with a redirect to a signed codeload URL, which the
 * browser downloads directly.
 */
export async function sourceCodeZipUrl(projectId: string): Promise<string> {
  const { token } = config();
  const repo = await linkedBackupRepo(projectId);
  if (!repo) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Your code isn't ready to download yet." });
  }
  const res = await github(`/repositories/${repo.id}/zipball`, token, { redirect: "manual" });
  const location = res.headers.get("location");
  if (res.status !== 302 || !location) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Couldn't prepare the download." });
  }
  return location;
}

export type SourceTreeEntry = { path: string; type: "blob" | "tree"; sha: string; size: number | null };

/** Every file and folder in the backup repo's default branch (code browser). */
export async function sourceTree(projectId: string): Promise<{ entries: SourceTreeEntry[]; truncated: boolean }> {
  const { token } = config();
  const repo = await linkedBackupRepo(projectId);
  if (!repo) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Your code isn't ready to download yet." });
  }
  const full = await githubJson<GithubRepo>(`/repositories/${repo.id}`, token);
  const branch = encodeURIComponent(full?.default_branch ?? "main");
  const tree = await githubJson<{
    tree: { path: string; type: string; sha: string; size?: number }[];
    truncated: boolean;
  }>(`/repositories/${repo.id}/git/trees/${branch}?recursive=1`, token);
  // An empty repo (never pushed) has no branch yet.
  if (!tree) return { entries: [], truncated: false };
  return {
    entries: tree.tree
      .filter((e) => e.type === "blob" || e.type === "tree")
      .map((e) => ({ path: e.path, type: e.type as "blob" | "tree", sha: e.sha, size: e.size ?? null })),
    truncated: tree.truncated,
  };
}

const MAX_FILE_BYTES = 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

export type SourceFile =
  | { kind: "text"; content: string }
  | { kind: "image"; dataUrl: string }
  | { kind: "binary"; size: number }
  | { kind: "too-large"; size: number };

/**
 * One file of the backup repo, by blob sha. The lookup is scoped to the
 * project's own repo id, so a sha from another repo can't be read.
 */
export async function sourceFile(projectId: string, sha: string, path: string): Promise<SourceFile> {
  const { token } = config();
  const repo = await linkedBackupRepo(projectId);
  if (!repo) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Your code isn't ready to download yet." });
  }
  const blob = await githubJson<{ content: string; encoding: string; size: number }>(
    `/repositories/${repo.id}/git/blobs/${sha}`,
    token
  );
  if (!blob) throw new TRPCError({ code: "NOT_FOUND", message: "That file isn't in your code anymore." });
  if (blob.size > MAX_FILE_BYTES) return { kind: "too-large", size: blob.size };
  const bytes = Buffer.from(blob.content, blob.encoding === "base64" ? "base64" : "utf8");
  const mime = IMAGE_TYPES[path.split(".").pop()?.toLowerCase() ?? ""];
  if (mime) return { kind: "image", dataUrl: `data:${mime};base64,${bytes.toString("base64")}` };
  if (bytes.subarray(0, 8000).includes(0)) return { kind: "binary", size: blob.size };
  return { kind: "text", content: bytes.toString("utf8") };
}
