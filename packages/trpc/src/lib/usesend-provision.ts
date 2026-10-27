import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { hubProject } from "@workspace/drizzle/schema";
import { UseSendError, usesendFetch } from "@workspace/email/usesend";

// ─── Per-project useSend provisioning ────────────────────────────
// Every project is its own useSend team (workspace), keyed by repoId
// (Team.externalId). Created with the instance admin key; the returned per-team
// API key is stored on hub_project and scopes every later call. Sending uses a
// single shared, env-configured agency domain that every team may send from
// (useSend's USESEND_SHARED_SENDING_DOMAIN) — there is no per-project domain, so
// a team is ready to send the moment it exists. Idempotent and safe to retry.

const adminKey = () => {
  const key = process.env.USESEND_ADMIN_API_KEY;
  if (!key) {
    throw new Error(
      "USESEND_ADMIN_API_KEY is not set — cannot provision useSend workspaces."
    );
  }
  return key;
};

type WorkspaceResponse = {
  teamId: number;
  externalId: string;
  name: string;
  apiKey: string;
};

/**
 * Ensure the project has a useSend team + API key. Returns the stored key when
 * one already exists (idempotent), else creates the workspace via the admin API
 * and persists it. Throws a clear error if the team exists on the instance but
 * we never stored its key (409) — the key can't be re-derived.
 */
export async function ensureProjectWorkspace(args: {
  repoId: number;
  name: string;
}): Promise<{ teamId: number; apiKey: string }> {
  const { repoId, name } = args;

  const [row] = await db
    .select({
      teamId: hubProject.usesendTeamId,
      apiKey: hubProject.usesendApiKey,
    })
    .from(hubProject)
    .where(eq(hubProject.repoId, repoId))
    .limit(1);

  if (row?.apiKey && row.teamId != null) {
    return { teamId: row.teamId, apiKey: row.apiKey };
  }

  let res: WorkspaceResponse;
  try {
    res = await usesendFetch<WorkspaceResponse>("/api/v1/workspaces", {
      method: "POST",
      apiKey: adminKey(),
      body: { name, externalId: String(repoId) },
    });
  } catch (error) {
    if (error instanceof UseSendError && error.status === 409) {
      throw new Error(
        `useSend already has a team for repo ${repoId} but its API key was never stored; an admin must mint a new key.`
      );
    }
    throw error;
  }

  await db
    .update(hubProject)
    .set({ usesendTeamId: res.teamId, usesendApiKey: res.apiKey })
    .where(eq(hubProject.repoId, repoId));

  return { teamId: res.teamId, apiKey: res.apiKey };
}

/**
 * Best-effort, non-blocking provisioning at project creation. Creates the
 * project's useSend team so client-hub can pull its emails by repoId. Never
 * throws — failures are logged and the Emails view's "Set up emails" button
 * retries.
 */
export async function provisionProjectEmails(args: {
  repoId: number;
  name: string;
}): Promise<void> {
  try {
    await ensureProjectWorkspace({ repoId: args.repoId, name: args.name });
  } catch (error) {
    console.error("useSend provisioning failed for repo", args.repoId, error);
  }
}
