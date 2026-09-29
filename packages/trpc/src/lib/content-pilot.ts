import { TRPCError } from "@trpc/server";

/**
 * Server-side client for the content-pilot AI editing service. Its session API
 * is server-to-server (x-api-key, no CORS), so the hub reads it here and exposes
 * it through tRPC — the api key never reaches the browser.
 */

const config = () => {
  const url = process.env.CONTENT_PILOT_URL;
  const apiKey = process.env.CONTENT_PILOT_API_KEY;
  if (!url || !apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "AI editing is not configured on this server.",
    });
  }
  return { url: url.replace(/\/+$/, ""), apiKey };
};

// ---------------------------------------------------------------------------
// Live-preview AI sessions
// ---------------------------------------------------------------------------

export type PreviewSession = {
  id: string;
  repoId: number;
  owner: string;
  repo: string;
  status:
    | "starting"
    | "installing"
    | "ready"
    | "restarting"
    | "paused"
    | "needs_config"
    | "failed"
    | "closed"
    | "published"
    | "expired";
  branch: string;
  previewUrl: string;
  error: string | null;
  createdAt: string;
};

async function pilotFetch(path: string, init?: RequestInit): Promise<Response> {
  const { url, apiKey } = config();
  let res: Response;
  try {
    res = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        "x-api-key": apiKey,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `content-pilot unreachable: ${
        error instanceof Error ? error.message : "network error"
      }`,
    });
  }
  return res;
}

async function pilotError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  // 409/429 carry client-facing messages (capacity, busy repo) — pass them on.
  throw new TRPCError({
    code:
      res.status === 409
        ? "CONFLICT"
        : res.status === 429
          ? "TOO_MANY_REQUESTS"
          : "INTERNAL_SERVER_ERROR",
    message: body?.error ?? `content-pilot ${res.status}`,
  });
}

/** Starts (or joins) the repo's live-preview session. */
export async function createPreviewSession(
  repoId: number,
  requestedBy?: string
): Promise<PreviewSession> {
  const res = await pilotFetch(`/api/v1/sessions`, {
    method: "POST",
    body: JSON.stringify({ repoId, requestedBy }),
  });
  if (!res.ok) await pilotError(res);
  return (await res.json()) as PreviewSession;
}

/** Every live session across all repos (dashboard "active sessions" list). */
export async function listLivePreviewSessions(): Promise<PreviewSession[]> {
  const res = await pilotFetch(`/api/v1/sessions`);
  if (!res.ok) await pilotError(res);
  const data = (await res.json()) as { sessions?: PreviewSession[] };
  return data.sessions ?? [];
}

/** The repo's active session, or null. */
export async function getPreviewSession(
  repoId: number
): Promise<PreviewSession | null> {
  const res = await pilotFetch(`/api/v1/sessions?repoId=${repoId}`);
  if (!res.ok) await pilotError(res);
  const data = (await res.json()) as { session: PreviewSession | null };
  return data.session;
}

/** Marks a session terminal; the supervisor tears the dev server down. */
export async function closePreviewSession(
  sessionId: string,
  reason: "discard" | "published"
): Promise<void> {
  const res = await pilotFetch(`/api/v1/sessions/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ action: "close", reason }),
  });
  if (!res.ok && res.status !== 404) await pilotError(res);
}

/**
 * Discards a session's changes: the supervisor resets preview/<id> back to
 * production main and clears the AI context + transcript, keeping the session
 * live. The dev server stays up and HMRs the reverted files.
 */
export async function resetPreviewSession(sessionId: string): Promise<void> {
  const res = await pilotFetch(`/api/v1/sessions/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ action: "reset" }),
  });
  if (!res.ok && res.status !== 404) await pilotError(res);
}

/** Pauses a session's in-flight AI run; the supervisor aborts + reverts it. */
export async function cancelPreviewMessage(sessionId: string): Promise<void> {
  const res = await pilotFetch(`/api/v1/sessions/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ action: "cancel" }),
  });
  if (!res.ok && res.status !== 404) await pilotError(res);
}
