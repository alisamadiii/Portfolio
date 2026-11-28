import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  saved: [] as Record<string, unknown>[],
  calls: [] as { path: string; init: Record<string, unknown> }[],
  impl: (async () => ({})) as (path: string) => Promise<unknown>,
}));

vi.mock("@workspace/drizzle/index", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => (h.row ? [h.row] : []) }) }) }),
    update: () => ({ set: (v: Record<string, unknown>) => ({ where: async () => void h.saved.push(v) }) }),
  },
}));
vi.mock("@workspace/email/usesend", () => {
  class UseSendError extends Error {
    constructor(
      readonly status: number,
      readonly code: string | undefined,
      message: string
    ) {
      super(message);
    }
  }
  return {
    UseSendError,
    usesendFetch: (path: string, init: Record<string, unknown>) => {
      h.calls.push({ path, init });
      return h.impl(path);
    },
  };
});

const { UseSendError } = await import("@workspace/email/usesend");
const { workspaceFetch } = await import("@workspace/trpc/lib/usesend-provision");

describe("workspaceFetch", () => {
  beforeEach(() => {
    process.env.USESEND_ADMIN_API_KEY = "admin";
    h.calls = [];
    h.impl = async () => ({});
  });

  it("sends the admin key with the team id header", async () => {
    await workspaceFetch(11, "/api/v1/campaigns", { method: "GET" });
    expect(h.calls[0]!.init).toMatchObject({ apiKey: "admin", headers: { "X-Team-Id": "11" } });
  });

  it("refuses a missing or bogus team id instead of calling as no team", () => {
    for (const bad of [0, -1, NaN, 1.5]) {
      expect(() => workspaceFetch(bad, "/api/v1/campaigns")).toThrow();
    }
    expect(h.calls).toEqual([]);
  });
});
