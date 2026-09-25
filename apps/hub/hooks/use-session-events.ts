"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live SSE layer for an AI preview session. Connects straight to
 * content-pilot (`NEXT_PUBLIC_CONTENT_PILOT_URL`) with the repo-scoped edit
 * token — EventSource can't set headers, so the token rides the query string.
 * Events are persisted rows on the server; `Last-Event-ID` makes reconnects
 * (including token rotation) lossless.
 *
 * The reducer folds raw Claude stream-json events into a per-message render
 * model the chat panel draws Claude-style: thinking shimmer, tool activity
 * lines, streamed text.
 */

export type ToolActivity = {
  kind: "tool";
  label: string;
};

export type CommitActivity = {
  kind: "commit";
  sha: string;
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

const emptyRun = (): MessageRun => ({
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

const toolLabel = (name: string, input: Record<string, unknown>) => {
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
    default:
      return name;
  }
};

type ClaudeEvent = {
  messageId: number | null;
  type?: string;
  message?: { content?: Array<Record<string, unknown>> };
  event?: {
    type?: string;
    delta?: { type?: string; text?: string; thinking?: string };
    content_block?: { type?: string };
  };
};

const reduceClaude = (run: MessageRun, data: ClaudeEvent): MessageRun => {
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

export function useSessionEvents(params: {
  sessionId: string | null;
  editToken: string;
  /** Invalidate the transcript query (a message reached a terminal state). */
  onMessageDone: () => void;
  /** Invalidate the session query (status changed / session ended). */
  onSessionChange: () => void;
}) {
  const { sessionId, editToken, onMessageDone, onSessionChange } = params;
  const [runs, setRuns] = useState<Map<number, MessageRun>>(new Map());
  const [connected, setConnected] = useState(false);

  // Keep the callbacks out of the effect deps so a re-render never tears the
  // stream down; the refs always point at the latest closures.
  const onMessageDoneRef = useRef(onMessageDone);
  onMessageDoneRef.current = onMessageDone;
  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  useEffect(() => {
    const pilotUrl = process.env.NEXT_PUBLIC_CONTENT_PILOT_URL;
    if (!sessionId || !editToken || !pilotUrl) return;

    const source = new EventSource(
      `${pilotUrl.replace(/\/+$/, "")}/api/v1/sessions/${sessionId}/events?token=${encodeURIComponent(editToken)}`
    );
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const withRun = (
      messageId: number | null,
      update: (run: MessageRun) => MessageRun
    ) => {
      if (messageId === null) return;
      setRuns((prev) => {
        const next = new Map(prev);
        next.set(messageId, update(prev.get(messageId) ?? emptyRun()));
        return next;
      });
    };

    source.addEventListener("claude", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as ClaudeEvent;
        withRun(data.messageId, (run) => reduceClaude(run, data));
      } catch {
        // malformed event — skip
      }
    });
    source.addEventListener("commit", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          messageId: number | null;
          sha: string;
        };
        withRun(data.messageId, (run) => ({
          ...run,
          activities: [...run.activities, { kind: "commit", sha: data.sha }],
        }));
      } catch {
        // skip
      }
    });
    source.addEventListener("message-done", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          messageId: number | null;
          status: "done" | "failed" | "rejected";
          commitSha: string | null;
          error: string | null;
          reply: string | null;
        };
        withRun(data.messageId, (run) => ({
          ...run,
          thinking: false,
          done: data,
        }));
      } catch {
        // skip
      }
      onMessageDoneRef.current();
    });
    source.addEventListener("status", () => onSessionChangeRef.current());
    source.addEventListener("session-error", () =>
      onSessionChangeRef.current()
    );
    source.addEventListener("session-ended", () => {
      onSessionChangeRef.current();
      source.close();
      setConnected(false);
    });

    return () => {
      source.close();
      setConnected(false);
    };
    // Recreated on token rotation — Last-Event-ID replays anything missed.
  }, [sessionId, editToken]);

  // New session → drop stale runs.
  useEffect(() => {
    setRuns(new Map());
  }, [sessionId]);

  return { runs, connected };
}
