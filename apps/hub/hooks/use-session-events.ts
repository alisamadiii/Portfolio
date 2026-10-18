"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  advanceCursor,
  emptyRun,
  eventsUrl,
  reduceClaude,
  resumeFrom,
  sessionEndedOutcome,
  shouldReconnect,
  type ClaudeEvent,
  type MessageRun,
  type StreamCursor,
} from "@/lib/session-events";

export type {
  CommitActivity,
  MessageRun,
  ToolActivity,
} from "@/lib/session-events";

/**
 * Live SSE layer for an AI preview session. Connects straight to
 * content-pilot (`NEXT_PUBLIC_CONTENT_PILOT_URL`) with the repo-scoped edit
 * token — EventSource can't set headers, so the token rides the query string.
 * Events are persisted rows on the server; the cursor (`?after=` on a fresh
 * connection, `Last-Event-ID` on browser auto-reconnects) makes every
 * reconnect lossless and duplicate-free.
 *
 * The reducer (lib/session-events.ts) folds raw Claude stream-json events
 * into a per-message render model the chat panel draws Claude-style:
 * thinking shimmer, tool activity lines, streamed text.
 *
 * A paused session closes the stream with `session-ended` but is only
 * dormant: a message revives it server-side and the run streams again. The
 * hook therefore reopens the stream when the caller reports a live status
 * again, or immediately via `reconnect()` right after a send.
 */
export function useSessionEvents(params: {
  sessionId: string | null;
  editToken: string;
  /** Current session status from the hub's session query (drives revive). */
  sessionStatus: string | null | undefined;
  /** Invalidate the transcript query (a message reached a terminal state). */
  onMessageDone: () => void;
  /** Invalidate the session query (status changed / session ended). */
  onSessionChange: () => void;
}) {
  const {
    sessionId,
    editToken,
    sessionStatus,
    onMessageDone,
    onSessionChange,
  } = params;
  const [runs, setRuns] = useState<Map<number, MessageRun>>(new Map());
  const [connected, setConnected] = useState(false);
  // Bumped to tear down + reopen the stream from the cursor.
  const [generation, setGeneration] = useState(0);
  // Set when the server ended the stream for a paused (revivable) session.
  const dormantRef = useRef(false);
  const cursorRef = useRef<StreamCursor>({ sessionId: null, id: 0 });

  // Keep the callbacks out of the effect deps so a re-render never tears the
  // stream down; the refs always point at the latest closures.
  const onMessageDoneRef = useRef(onMessageDone);
  onMessageDoneRef.current = onMessageDone;
  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  /** Reopen a dormant stream now (call right after sending a message). */
  const reconnect = useCallback(() => {
    if (!dormantRef.current) return;
    dormantRef.current = false;
    setGeneration((value) => value + 1);
  }, []);

  // Status polling / another tab / the auto-revive on project open flipped a
  // dormant session back to live → resume the stream.
  useEffect(() => {
    if (shouldReconnect({ dormant: dormantRef.current, sessionStatus })) {
      reconnect();
    }
  }, [sessionStatus, reconnect]);

  useEffect(() => {
    const pilotUrl = process.env.NEXT_PUBLIC_CONTENT_PILOT_URL;
    if (!sessionId || !editToken || !pilotUrl) return;

    const source = new EventSource(
      eventsUrl({
        pilotUrl,
        sessionId,
        editToken,
        after: resumeFrom(cursorRef.current, sessionId),
      })
    );
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const track = (event: Event) => {
      cursorRef.current = advanceCursor(
        cursorRef.current,
        sessionId,
        (event as MessageEvent).lastEventId
      );
    };

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
      track(event);
      try {
        const data = JSON.parse((event as MessageEvent).data) as ClaudeEvent;
        withRun(data.messageId, (run) => reduceClaude(run, data));
      } catch {
        // malformed event — skip
      }
    });
    source.addEventListener("commit", (event) => {
      track(event);
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          messageId: number | null;
          sha: string;
          files?: string[];
        };
        withRun(data.messageId, (run) => ({
          ...run,
          activities: [
            ...run.activities,
            { kind: "commit", sha: data.sha, files: data.files ?? [] },
          ],
        }));
      } catch {
        // skip
      }
    });
    source.addEventListener("message-done", (event) => {
      track(event);
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
    source.addEventListener("status", (event) => {
      track(event);
      onSessionChangeRef.current();
    });
    source.addEventListener("session-error", (event) => {
      track(event);
      onSessionChangeRef.current();
    });
    source.addEventListener("session-idle-warning", track);
    source.addEventListener("reset", track);
    source.addEventListener("session-ended", (event) => {
      let status: string | null = null;
      try {
        status = (
          JSON.parse((event as MessageEvent).data) as { status?: string }
        ).status ?? null;
      } catch {
        // treat as closed
      }
      onSessionChangeRef.current();
      source.close();
      setConnected(false);
      dormantRef.current = sessionEndedOutcome(status) === "dormant";
    });

    return () => {
      source.close();
      setConnected(false);
    };
    // Recreated on token rotation / reconnect — the cursor replays only what
    // was missed.
  }, [sessionId, editToken, generation]);

  // New session → drop stale runs + dormancy (the cursor is session-scoped).
  useEffect(() => {
    setRuns(new Map());
    dormantRef.current = false;
  }, [sessionId]);

  return { runs, connected, reconnect };
}
