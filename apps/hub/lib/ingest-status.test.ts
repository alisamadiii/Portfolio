import { describe, expect, it } from "vitest";

import { ingestVerdict } from "@workspace/trpc/lib/agency/ingest-status";

describe("ingestVerdict", () => {
  it("is not done while Google is still processing", () => {
    expect(ingestVerdict([{ requestStatus: "PROCESSING" }])).toEqual({ done: false });
  });

  it("is not done when the status is missing or unknown", () => {
    expect(ingestVerdict([])).toEqual({ done: false });
    expect(ingestVerdict(undefined)).toEqual({ done: false });
    expect(ingestVerdict([{ requestStatus: "SOMETHING_NEW" }])).toEqual({ done: false });
  });

  it("confirms a successful ingest", () => {
    expect(ingestVerdict([{ requestStatus: "SUCCESS" }])).toEqual({ done: true, ok: true });
  });

  it("surfaces the rejection reason on failure", () => {
    const verdict = ingestVerdict([
      {
        requestStatus: "FAILED",
        errorInfo: { errorCounts: [{ reason: "CLICK_NOT_FOUND", recordCount: "1" }] },
      },
    ]);
    expect(verdict).toEqual({
      done: true,
      ok: false,
      error: "Google rejected the conversion: CLICK_NOT_FOUND",
    });
  });

  it("treats a partial success of our single event as a rejection", () => {
    const verdict = ingestVerdict([{ requestStatus: "PARTIAL_SUCCESS" }]);
    expect(verdict.done).toBe(true);
    expect("ok" in verdict && verdict.ok).toBe(false);
  });

  it("skips empty error counts when picking a reason", () => {
    const verdict = ingestVerdict([
      {
        requestStatus: "FAILED",
        errorInfo: { errorCounts: [{ recordCount: "1" }, { reason: "INVALID_FORMAT" }] },
      },
    ]);
    expect("error" in verdict && verdict.error).toContain("INVALID_FORMAT");
  });
});
