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
