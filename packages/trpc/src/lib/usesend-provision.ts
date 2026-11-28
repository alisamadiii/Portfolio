import "server-only";

import { usesendFetch } from "@workspace/email/usesend";

// ─── Per-project useSend provisioning ────────────────────────────
// Some projects own a useSend team (workspace), keyed by projectId
// (Team.externalId) and stored as hub_project.usesend_team_id (legacy: the
// Newsletter app used to create them). Every call uses the instance admin key
// + X-Team-Id (workspaceFetch), so there are no per-project keys to store.

const adminKey = () => {
  const key = process.env.USESEND_ADMIN_API_KEY;
  if (!key) {
    throw new Error(
      "USESEND_ADMIN_API_KEY is not set — cannot provision useSend workspaces."
    );
  }
  return key;
};

/**
 * A useSend call AS one workspace: the instance admin key plus X-Team-Id. The
 * team id must come from hub_project (never from request input); useSend only
 * accepts hub-provisioned workspaces here and scopes every query to that team.
 */
export function workspaceFetch<T>(
  teamId: number,
  path: string,
  init: Omit<Parameters<typeof usesendFetch>[1] & object, "apiKey" | "headers"> = {}
): Promise<T> {
  if (!Number.isSafeInteger(teamId) || teamId <= 0) {
    throw new Error("Invalid useSend team id");
  }
  return usesendFetch<T>(path, {
    ...init,
    apiKey: adminKey(),
    headers: { "X-Team-Id": String(teamId) },
  });
}
