import { TRPCError } from "@trpc/server";

/**
 * Server-side client for the content-pilot AI-edit service. content-pilot's job
 * API is server-to-server (x-api-key, no CORS), so the hub reads it here and
 * exposes it through tRPC — the api key never reaches the browser.
 */

export type ContentPilotJob = {
  id: number;
  repoId: number;
  owner: string;
  repo: string;
  branch: string;
  prompt: string;
  requestedBy: string | null;
  status: string;
  error: string | null;
  resultSummary: string | null;
  commitSha: string | null;
  batchId: number | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

const config = () => {
  const url = process.env.CONTENT_PILOT_URL;
  const apiKey = process.env.CONTENT_PILOT_API_KEY;
  if (!url || !apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "AI deployments are not configured on this server.",
    });
  }
  return { url: url.replace(/\/+$/, ""), apiKey };
};

/** Lists a repo's AI edit jobs (newest first), scoped by GitHub repoId. */
export async function listEditJobs(
  repoId: number,
  limit = 50
): Promise<ContentPilotJob[]> {
  const { url, apiKey } = config();

  let res: Response;
  try {
    res = await fetch(`${url}/api/v1/jobs?repoId=${repoId}&limit=${limit}`, {
      headers: { "x-api-key": apiKey },
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `content-pilot unreachable: ${
        error instanceof Error ? error.message : "network error"
      }`,
    });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `content-pilot ${res.status}: ${body.slice(0, 300)}`,
    });
  }

  const data = (await res.json()) as { jobs?: ContentPilotJob[] };
  return data.jobs ?? [];
}
