"use client";

import { useQuery } from "@tanstack/react-query";

export type TranscriptMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  status: "queued" | "running" | "done" | "failed" | "rejected";
  commitSha: string | null;
  error: string | null;
  createdAt: string;
  /** Usage is recorded on the user message that drove the run. */
  inputTokens: number | null;
  outputTokens: number | null;
};

export type Transcript = {
  id: string;
  status: string;
  messages: TranscriptMessage[];
};

const pilotUrl = (process.env.NEXT_PUBLIC_CONTENT_PILOT_URL ?? "").replace(
  /\/+$/,
  ""
);

/**
 * The session transcript straight from content-pilot (edit token, CORS'd) —
 * the hub stores nothing session-shaped. Shared by the chat panel and the
 * header's session actions (same query key → one fetch). SSE message-done
 * events drive refetches; the interval is only a fallback for a dropped
 * stream.
 */
export function useSessionTranscript(
  sessionId: string | null | undefined,
  editToken: string
) {
  return useQuery({
    queryKey: ["preview-session-transcript", sessionId],
    enabled: Boolean(sessionId && editToken && pilotUrl),
    refetchInterval: 60_000,
    queryFn: async (): Promise<Transcript> => {
      const res = await fetch(`${pilotUrl}/api/v1/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${editToken}` },
      });
      if (!res.ok) throw new Error(`transcript ${res.status}`);
      return (await res.json()) as Transcript;
    },
  });
}

/** True while any request is queued or running — publish/discard should wait. */
export function transcriptBusy(transcript: Transcript | undefined): boolean {
  return (transcript?.messages ?? []).some(
    (message) =>
      message.role === "user" &&
      (message.status === "queued" || message.status === "running")
  );
}
