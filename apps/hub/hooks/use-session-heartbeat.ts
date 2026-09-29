"use client";

import { useEffect } from "react";

const pilotUrl = (process.env.NEXT_PUBLIC_CONTENT_PILOT_URL ?? "").replace(
  /\/+$/,
  ""
);

const LIVE = new Set(["starting", "installing", "ready", "restarting"]);

/**
 * Open-tab keep-alive for a live-preview session. content-pilot's idle sweep
 * pauses sessions ~TTL after the last activity; this pings the heartbeat
 * endpoint every minute while the project page is open and visible, so the
 * session winds down only after the client actually leaves. Failures are
 * ignored — the sweep just falls back to message-driven activity.
 */
export function useSessionHeartbeat({
  sessionId,
  status,
  editToken,
}: {
  sessionId: string | null;
  status: string | null;
  editToken: string;
}) {
  const active = Boolean(
    sessionId && editToken && pilotUrl && status && LIVE.has(status)
  );

  useEffect(() => {
    if (!active) return;
    const beat = () => {
      if (document.hidden) return;
      void fetch(`${pilotUrl}/api/v1/sessions/${sessionId}/heartbeat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${editToken}` },
      }).catch(() => {});
    };
    const onVisible = () => {
      if (!document.hidden) beat();
    };
    beat();
    const timer = setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, sessionId, editToken]);
}
