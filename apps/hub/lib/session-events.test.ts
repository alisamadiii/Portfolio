import { describe, expect, it } from "vitest";

import {
  advanceCursor,
  emptyRun,
  eventsUrl,
  isLiveSessionStatus,
  reduceClaude,
  resumeFrom,
  sessionEndedOutcome,
  shouldReconnect,
  toolLabel,
  transcriptRefetchMs,
  TRANSCRIPT_POLL_BUSY_MS,
  TRANSCRIPT_POLL_IDLE_MS,
  type ClaudeEvent,
  type StreamCursor,
} from "./session-events";

// 2026-10-18, EmpowerHer session qh2dtmf7mk7s: the session had been paused
// since Oct 15. The hub's EventSource got `session-ended {status:"paused"}`
// on page load and closed for good; the next message revived the session
// server-side and ran to completion (events 794–797, 798–804, 805–811) but
// the hub stayed on "Working…" until a manual refresh.
describe("sessionEndedOutcome", () => {
  it("paused session: session-ended leaves the stream dormant, not closed", () => {
    expect(sessionEndedOutcome("paused")).toBe("dormant");
  });

  // DELIBERATE CHANGE (root-only sites): 'needs_config' (admin app-folder
  // setup) no longer exists, so it left the terminal-status list.
  it("terminal statuses end the stream for good", () => {
    for (const status of ["closed", "failed", "published", "expired"]) {
      expect(sessionEndedOutcome(status)).toBe("closed");
    }
  });

  it("missing/unparseable status is treated as closed", () => {
    expect(sessionEndedOutcome(null)).toBe("closed");
    expect(sessionEndedOutcome(undefined)).toBe("closed");
  });
});

describe("shouldReconnect", () => {
  it("dormant stream reconnects once the session reports a live status", () => {
    for (const status of ["starting", "installing", "ready", "restarting"]) {
      expect(shouldReconnect({ dormant: true, sessionStatus: status })).toBe(
        true
      );
    }
  });

  it("dormant stream stays closed while the session is still paused", () => {
    expect(shouldReconnect({ dormant: true, sessionStatus: "paused" })).toBe(
      false
    );
  });

  it("a healthy (non-dormant) stream is never torn down by status polling", () => {
    expect(shouldReconnect({ dormant: false, sessionStatus: "ready" })).toBe(
      false
    );
    expect(
      shouldReconnect({ dormant: false, sessionStatus: "installing" })
    ).toBe(false);
  });

  it("dormant stream does not reconnect for terminal statuses", () => {
    for (const status of ["closed", "failed", "published", "expired"]) {
      expect(shouldReconnect({ dormant: true, sessionStatus: status })).toBe(
        false
      );
    }
  });
});

describe("isLiveSessionStatus", () => {
  it("mirrors content-pilot's live set exactly", () => {
    expect(isLiveSessionStatus("starting")).toBe(true);
    expect(isLiveSessionStatus("installing")).toBe(true);
    expect(isLiveSessionStatus("ready")).toBe(true);
    expect(isLiveSessionStatus("restarting")).toBe(true);
    expect(isLiveSessionStatus("paused")).toBe(false);
    expect(isLiveSessionStatus(null)).toBe(false);
    expect(isLiveSessionStatus(undefined)).toBe(false);
  });
});

describe("advanceCursor / resumeFrom", () => {
  const fresh: StreamCursor = { sessionId: null, id: 0 };

  it("advances with numeric event ids", () => {
    const next = advanceCursor(fresh, "s1", "794");
    expect(next).toEqual({ sessionId: "s1", id: 794 });
    expect(resumeFrom(next, "s1")).toBe(794);
  });

  it("unnumbered frames (session-ended) leave the cursor untouched", () => {
    const at = { sessionId: "s1", id: 797 };
    expect(advanceCursor(at, "s1", "")).toEqual(at);
    expect(advanceCursor(at, "s1", null)).toEqual(at);
    expect(advanceCursor(at, "s1", undefined)).toEqual(at);
  });

  it("non-numeric ids leave the cursor untouched", () => {
    const at = { sessionId: "s1", id: 797 };
    expect(advanceCursor(at, "s1", "abc")).toEqual(at);
  });

  it("never moves backwards on an out-of-order replay", () => {
    const at = { sessionId: "s1", id: 811 };
    expect(advanceCursor(at, "s1", "804")).toEqual(at);
  });

  it("a different session starts over at 0 (cursor is session-scoped)", () => {
    const at = { sessionId: "s1", id: 811 };
    expect(resumeFrom(at, "s2")).toBe(0);
    expect(advanceCursor(at, "s2", "3")).toEqual({ sessionId: "s2", id: 3 });
  });
});

describe("eventsUrl", () => {
  it("first connect carries only the token", () => {
    expect(
      eventsUrl({
        pilotUrl: "https://pilot.example.com",
        sessionId: "qh2dtmf7mk7s",
        editToken: "tok",
        after: 0,
      })
    ).toBe(
      "https://pilot.example.com/api/v1/sessions/qh2dtmf7mk7s/events?token=tok"
    );
  });

  it("reconnect resumes from the cursor so replays never duplicate deltas", () => {
    expect(
      eventsUrl({
        pilotUrl: "https://pilot.example.com/",
        sessionId: "qh2dtmf7mk7s",
        editToken: "tok",
        after: 797,
      })
    ).toBe(
      "https://pilot.example.com/api/v1/sessions/qh2dtmf7mk7s/events?token=tok&after=797"
    );
  });

  it("url-encodes the edit token", () => {
    expect(
      eventsUrl({
        pilotUrl: "https://p",
        sessionId: "s",
        editToken: "a+b/c=",
        after: 0,
      })
    ).toContain("token=a%2Bb%2Fc%3D");
  });
});

describe("transcriptRefetchMs", () => {
  it("busy transcript polls fast as a fallback for a dropped stream", () => {
    expect(transcriptRefetchMs(true)).toBe(TRANSCRIPT_POLL_BUSY_MS);
    expect(TRANSCRIPT_POLL_BUSY_MS).toBeLessThanOrEqual(5_000);
  });

  it("idle transcript keeps the slow heartbeat", () => {
    expect(transcriptRefetchMs(false)).toBe(TRANSCRIPT_POLL_IDLE_MS);
    expect(TRANSCRIPT_POLL_IDLE_MS).toBe(60_000);
  });
});

// Baseline for the reducer now that it lives outside the hook.
describe("reduceClaude", () => {
  const delta = (text: string): ClaudeEvent => ({
    messageId: 193,
    type: "stream_event",
    event: { type: "content_block_delta", delta: { type: "text_delta", text } },
  });

  it("/manage-team reply: text deltas accumulate in order", () => {
    let run = emptyRun();
    for (const part of [
      "What",
      " would you like to do with the team members? Let me know who you'd like to add",
      ", update, or remove!",
    ]) {
      run = reduceClaude(run, delta(part));
    }
    expect(run.text).toBe(
      "What would you like to do with the team members? Let me know who you'd like to add, update, or remove!"
    );
    expect(run.thinking).toBe(false);
  });

  it("thinking block flags thinking + thought, text block start clears thinking", () => {
    let run = reduceClaude(emptyRun(), {
      messageId: 1,
      type: "stream_event",
      event: { type: "content_block_start", content_block: { type: "thinking" } },
    });
    expect(run.thinking).toBe(true);
    expect(run.thought).toBe(true);
    run = reduceClaude(run, {
      messageId: 1,
      type: "stream_event",
      event: { type: "content_block_start", content_block: { type: "text" } },
    });
    expect(run.thinking).toBe(false);
    expect(run.thought).toBe(true);
  });

  it("tool_use blocks become activity rows with a short label", () => {
    const run = reduceClaude(emptyRun(), {
      messageId: 195,
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Edit",
            input: {
              file_path: "/srv/workspace/1415906268/_collections/team.json",
            },
          },
        ],
      },
    });
    expect(run.activities).toEqual([
      {
        kind: "tool",
        name: "Edit",
        path: "/srv/workspace/1415906268/_collections/team.json",
        label: "Editing _collections/team.json",
      },
    ]);
  });

  it("assistant text block is authoritative over streamed deltas", () => {
    let run = reduceClaude(emptyRun(), delta("partial"));
    run = reduceClaude(run, {
      messageId: 1,
      type: "assistant",
      message: { content: [{ type: "text", text: "final answer" }] },
    });
    expect(run.text).toBe("final answer");
  });

  it("unknown event types are ignored", () => {
    const run = emptyRun();
    expect(reduceClaude(run, { messageId: 1, type: "system" })).toBe(run);
  });
});

describe("toolLabel", () => {
  it("drops the numeric clone dir from paths", () => {
    expect(toolLabel("Read", { file_path: "/w/1290180826/_site.json" })).toBe(
      "Reading _site.json"
    );
  });

  it("keeps a two-segment tail for nested files", () => {
    expect(
      toolLabel("Write", { file_path: "/w/1/src/pages/about.astro" })
    ).toBe("Writing pages/about.astro");
  });

  it("replace_in_files shows the needle", () => {
    expect(
      toolLabel("mcp__pilot__replace_in_files", { find: "Old Name" })
    ).toBe('Replacing "Old Name" everywhere');
  });
});
