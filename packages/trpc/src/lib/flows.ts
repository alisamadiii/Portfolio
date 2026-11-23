import "server-only";

import { TRPCError } from "@trpc/server";

// Automations page: the agency's Flows service (agency-toolkit/apps/flows).
// The api service holds one admin key (FLOWS_API_KEY) and asks Flows for a
// one-time /iframe link for a single hub project. The link is valid for 60s,
// works once, and the session it opens is pinned to that project's workspace,
// so the browser never sees the key or a way to reach another project.

const baseUrl = () => (process.env.FLOWS_URL || "https://flows.alisamadii.com").replace(/\/$/, "");

export const isFlowsConfigured = () => Boolean(process.env.FLOWS_API_KEY);

export type FlowsRole = "full-access" | "content-editor" | "view-only";

export async function createFlowsEmbed(input: {
  projectId: string;
  projectName: string;
  user: { id?: string; email?: string; name?: string };
  role: FlowsRole;
}): Promise<{ url: string; expiresAt: string }> {
  const key = process.env.FLOWS_API_KEY;
  if (!key) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Automations isn't configured (FLOWS_API_KEY)." });
  }
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/api/v1/embed-sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Automations is unreachable. Try again in a moment." });
  }
  const json = (await res.json().catch(() => ({}))) as { url?: string; expiresAt?: string; error?: string };
  if (!res.ok || !json.url) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: json.error || `Automations request failed (${res.status})` });
  }
  return { url: json.url, expiresAt: json.expiresAt ?? "" };
}
