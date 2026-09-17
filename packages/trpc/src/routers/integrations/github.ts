import "server-only";

import { createOctokitInstance } from "../../lib/cms/octokit";

// ─── GitHub repo webhooks ────────────────────────────────────────
// Registered on a user's own imported (self-deployed) repo so external pushes
// refresh the CMS cache. Secured with the GITHUB_WEBHOOK_SECRET the
// /api/webhook/github route verifies.

/** The public URL of our GitHub webhook endpoint, or null if not configured. */
export const githubWebhookUrl = (): string | null => {
  const base =
    process.env.GITHUB_WEBHOOK_URL_BASE ??
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_AUTH_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhook/github`;
};

/** Existing hook ids on the repo whose config.url matches ours. */
export const findRepoWebhook = async (
  token: string,
  owner: string,
  repo: string,
  url: string
): Promise<number | null> => {
  const octokit = createOctokitInstance(token);
  const { data } = await octokit.rest.repos.listWebhooks({
    owner,
    repo,
    per_page: 100,
  });
  const hook = data.find((h) => h.config?.url === url);
  return hook?.id ?? null;
};

/** Create a push webhook on the repo. Returns the new hook id. */
export const createRepoWebhook = async (
  token: string,
  owner: string,
  repo: string,
  url: string,
  secret: string
): Promise<number> => {
  const octokit = createOctokitInstance(token);
  const { data } = await octokit.rest.repos.createWebhook({
    owner,
    repo,
    name: "web",
    active: true,
    events: ["push", "repository", "delete"],
    config: {
      url,
      content_type: "json",
      secret,
      insecure_ssl: "0",
    },
  });
  return data.id;
};

/** Delete a repo webhook by id (best-effort at call sites). */
export const deleteRepoWebhook = async (
  token: string,
  owner: string,
  repo: string,
  hookId: number
): Promise<void> => {
  const octokit = createOctokitInstance(token);
  await octokit.rest.repos.deleteWebhook({ owner, repo, hook_id: hookId });
};
