import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";
import { UseSendError, usesendFetch } from "@workspace/email/usesend";

// ─── Per-project useSend provisioning ────────────────────────────
// Every project is its own useSend team (workspace), keyed by projectId
// (Team.externalId), created only from the Newsletter app's "Set up" button
// (never at import). Only the team id is stored (hub_project.usesend_team_id);
// every later call uses the instance admin key + X-Team-Id (workspaceFetch),
// so there are no per-project keys to store, lose or rotate.

const adminKey = () => {
  const key = process.env.USESEND_ADMIN_API_KEY;
  if (!key) {
    throw new Error(
      "USESEND_ADMIN_API_KEY is not set — cannot provision useSend workspaces."
    );
  }
  return key;
};

type WorkspaceResponse = { teamId: number; externalId: string; name: string };

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

/**
 * Ensure the project has a useSend workspace and return its team id. Creates
 * it via the admin API when missing; if useSend already has one for this
 * project (409), looks its id up instead. Idempotent.
 */
export async function ensureProjectWorkspace(args: {
  projectId: string;
  name: string;
}): Promise<{ teamId: number }> {
  const { projectId, name } = args;

  const [row] = await db
    .select({ teamId: hubProject.usesendTeamId })
    .from(hubProject)
    .where(eq(hubProject.id, projectId))
    .limit(1);
  if (row?.teamId != null) return { teamId: row.teamId };

  const externalId = String(projectId);
  let teamId: number;
  try {
    teamId = (
      await usesendFetch<WorkspaceResponse & { apiKey: string }>("/api/v1/workspaces", {
        method: "POST",
        apiKey: adminKey(),
        body: { name, externalId },
      })
    ).teamId;
  } catch (error) {
    if (error instanceof UseSendError && error.status === 409) {
      teamId = (
        await usesendFetch<WorkspaceResponse>(
          `/api/v1/workspaces/${encodeURIComponent(externalId)}`,
          { apiKey: adminKey() }
        )
      ).teamId;
    } else if (error instanceof UseSendError && (error.status === 401 || error.status === 404)) {
      throw new Error(
        `useSend refused the admin key (${error.status}). Check USESEND_ADMIN_API_KEY matches the instance.`
      );
    } else {
      throw error;
    }
  }

  await db.update(hubProject).set({ usesendTeamId: teamId }).where(eq(hubProject.id, projectId));
  return { teamId };
}
