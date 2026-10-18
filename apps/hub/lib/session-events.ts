/**
 * Pure pieces of the live AI-session stream (see hooks/use-session-events.ts):
 * the Claude stream-json reducer and the reconnect bookkeeping. Kept free of
 * React so every edge case can be locked in by a unit test.
 */

export type ToolActivity = {
  kind: "tool";
  label: string;
  /** Raw tool name (Read / Edit / Write / Glob / Grep / mcp__pilot__…). */
  name: string;
  /** The tool's file_path as the agent passed it (absolute inside the clone). */
  path: string | null;
};

export type CommitActivity = {
  kind: "commit";
  sha: string;
  /** Repo-relative paths the turn changed (from `git status`). */
  files: string[];
};

export type MessageRun = {
  /** Ordered activity feed (tool lines, commit rows). */
  activities: Array<ToolActivity | CommitActivity>;
  /** Assistant text streamed so far (deltas), or the final block text. */
  text: string;
  /** A thinking block is currently streaming. */
  thinking: boolean;
  /** Claude thought at least once (renders the collapsed "Thought" row). */
  thought: boolean;
  done: {
    status: "done" | "failed" | "rejected";
    commitSha: string | null;
    error: string | null;
    reply: string | null;
  } | null;
};

export const emptyRun = (): MessageRun => ({
  activities: [],
  text: "",
  thinking: false,
  thought: false,
  done: null,
});

const shortPath = (value: unknown) => {
  if (typeof value !== "string" || !value) return null;
  const parts = value.split("/").filter(Boolean);
  const tail = parts.slice(-2);
  // Drop the clone dir (the numeric repoId under workspace/) — "1290180826/
  // _site.json" reads as noise; the filename alone is what the client needs.
  if (/^\d+$/.test(tail[0] ?? "")) return tail[1] ?? tail[0]!;
  return tail.join("/");
};

export const toolLabel = (name: string, input: Record<string, unknown>) => {
  const file = shortPath(input.file_path);
  switch (name) {
    case "Read":
      return file ? `Reading ${file}` : "Reading files";
    case "Edit":
      return file ? `Editing ${file}` : "Editing";
    case "Write":
      return file ? `Writing ${file}` : "Writing";
    case "Glob":
    case "Grep":
      return typeof input.pattern === "string"
        ? `Searching ${input.pattern}`
        : "Searching the project";
    case "mcp__pilot__replace_in_files":
      return typeof input.find === "string"
        ? `Replacing "${input.find}" everywhere`
        : "Replacing text everywhere";
    default:
      return name;
  }
};

export type ClaudeEvent = {
  messageId: number | null;
  type?: string;
  message?: { content?: Array<Record<string, unknown>> };
  event?: {
    type?: string;
    delta?: { type?: string; text?: string; thinking?: string };
    content_block?: { type?: string };
  };
};

export const reduceClaude = (run: MessageRun, data: ClaudeEvent): MessageRun => {
  // Partial-message deltas: live typing + thinking shimmer.
  if (data.type === "stream_event") {
    const inner = data.event;
    if (inner?.type === "content_block_start") {
      const blockType = inner.content_block?.type;
      if (blockType === "thinking")
        return { ...run, thinking: true, thought: true };
      if (blockType === "text") return { ...run, thinking: false };
      return run;
    }
    if (inner?.type === "content_block_delta") {
      if (inner.delta?.type === "thinking_delta")
        return { ...run, thinking: true, thought: true };
      if (inner.delta?.type === "text_delta")
        return {
          ...run,
          thinking: false,
          text: run.text + (inner.delta.text ?? ""),
        };
    }
    return run;
  }
  // Whole assistant messages: authoritative text + tool_use activity lines.
  if (data.type === "assistant") {
    let next = run;
    for (const block of data.message?.content ?? []) {
      if (block.type === "tool_use") {
        next = {
          ...next,
          thinking: false,
          activities: [
            ...next.activities,
            {
              kind: "tool",
              name: String(block.name ?? ""),
              path:
                typeof (block.input as Record<string, unknown> | undefined)
                  ?.file_path === "string"
                  ? ((block.input as Record<string, unknown>)
                      .file_path as string)
                  : null,
              label: toolLabel(
                String(block.name ?? ""),
                (block.input as Record<string, unknown>) ?? {}
              ),
            },
          ],
        };
      } else if (block.type === "text" && typeof block.text === "string") {
        next = { ...next, thinking: false, text: block.text };
      }
    }
    return next;
  }
  return run;
};

// ---------------------------------------------------------------------------
// Reconnect bookkeeping
// ---------------------------------------------------------------------------

/**
 * Statuses while content-pilot owns a dev server + emits events. Mirrors
 * PREVIEW_SESSION_LIVE_STATUSES in content-pilot's schema.
 */
export const LIVE_SESSION_STATUSES = [
  "starting",
  "installing",
  "ready",
  "restarting",
] as const;

export const isLiveSessionStatus = (status: string | null | undefined) =>
  LIVE_SESSION_STATUSES.includes(
    status as (typeof LIVE_SESSION_STATUSES)[number]
  );

/**
 * What the client does when the server closes the stream with
 * `session-ended`. A paused session is dormant, not over: the next message
 * (or opening the project) revives it and the run streams again, so the
 * client must be ready to reconnect. Every other non-live status is final.
 */
export const sessionEndedOutcome = (
  status: string | null | undefined
): "dormant" | "closed" => (status === "paused" ? "dormant" : "closed");

/**
 * A dormant stream reconnects as soon as the session reports a live status
 * again (status polling, another tab, the auto-revive on project open).
 */
export const shouldReconnect = (params: {
  dormant: boolean;
  sessionStatus: string | null | undefined;
}) => params.dormant && isLiveSessionStatus(params.sessionStatus);

/** Last event id seen on a stream, scoped to the session it belongs to. */
export type StreamCursor = { sessionId: string | null; id: number };

/**
 * Advances the cursor with an SSE `lastEventId`. Non-numeric / empty ids
 * (the unnumbered `session-ended` frame) leave it untouched; a different
 * session starts over at 0.
 */
export const advanceCursor = (
  cursor: StreamCursor,
  sessionId: string,
  lastEventId: string | null | undefined
): StreamCursor => {
  const base: StreamCursor =
    cursor.sessionId === sessionId ? cursor : { sessionId, id: 0 };
  if (!lastEventId) return base;
  const id = Number(lastEventId);
  if (!Number.isFinite(id) || id <= base.id) return base;
  return { sessionId, id };
};

/** The cursor to resume from for `sessionId` (0 when the cursor is foreign). */
export const resumeFrom = (cursor: StreamCursor, sessionId: string) =>
  cursor.sessionId === sessionId ? cursor.id : 0;

/**
 * Transcript poll cadence. SSE drives refetches; polling is the safety net
 * for a dropped stream. While a request is queued/running the reply must
 * never sit unseen, so poll fast; idle transcripts keep a slow heartbeat.
 */
export const TRANSCRIPT_POLL_BUSY_MS = 3_000;
export const TRANSCRIPT_POLL_IDLE_MS = 60_000;
export const transcriptRefetchMs = (busy: boolean) =>
  busy ? TRANSCRIPT_POLL_BUSY_MS : TRANSCRIPT_POLL_IDLE_MS;

/**
 * Stream URL. EventSource can't set headers, so the edit token rides the
 * query string; `after` resumes a fresh connection where the previous one
 * stopped (the browser only sends Last-Event-ID on its own auto-reconnects,
 * never on a brand-new EventSource).
 */
export const eventsUrl = (params: {
  pilotUrl: string;
  sessionId: string;
  editToken: string;
  after: number;
}) => {
  const base = params.pilotUrl.replace(/\/+$/, "");
  const query = new URLSearchParams({ token: params.editToken });
  if (params.after > 0) query.set("after", String(params.after));
  return `${base}/api/v1/sessions/${params.sessionId}/events?${query.toString()}`;
};
