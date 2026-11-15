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
const { ensureProjectWorkspace, workspaceFetch } = await import(
  "@workspace/trpc/lib/usesend-provision"
);

// DELIBERATE CHANGE (2026-11-15): per-project keys are gone. Setup stores
// only the team id; a 409 looks the existing team up instead of minting a
// key (the mint endpoint was removed from the fork).
describe("ensureProjectWorkspace", () => {
  beforeEach(() => {
    process.env.USESEND_ADMIN_API_KEY = "admin";
    h.row = { teamId: null };
    h.saved = [];
    h.calls = [];
  });

  it("creates the workspace and stores only its team id", async () => {
    h.impl = async () => ({ teamId: 12, externalId: "p1", name: "a/b", apiKey: "us_ignored" });
    expect(await ensureProjectWorkspace({ projectId: "p1", name: "a/b" })).toEqual({ teamId: 12 });
    expect(h.saved).toEqual([{ usesendTeamId: 12 }]);
  });

  // Regression: a team that already existed (409) left the project unusable.
  it("links an existing workspace (409) by looking up its id", async () => {
    h.impl = async (path) => {
      if (path === "/api/v1/workspaces") throw new UseSendError(409, "NOT_UNIQUE", "exists");
      return { teamId: 7, externalId: "p1", name: "a/b" };
    };
    expect(await ensureProjectWorkspace({ projectId: "p1", name: "a/b" })).toEqual({ teamId: 7 });
    expect(h.calls.map((c) => c.path)).toEqual(["/api/v1/workspaces", "/api/v1/workspaces/p1"]);
    expect(h.saved).toEqual([{ usesendTeamId: 7 }]);
  });

  it("a rejected admin key says so", async () => {
    h.impl = async () => {
      throw new UseSendError(401, "UNAUTHORIZED", "Invalid admin token");
    };
    await expect(ensureProjectWorkspace({ projectId: "p1", name: "a/b" })).rejects.toThrow(
      /USESEND_ADMIN_API_KEY/
    );
    expect(h.saved).toEqual([]);
  });

  it("an already provisioned project is returned without calling useSend", async () => {
    h.row = { teamId: 3 };
    expect(await ensureProjectWorkspace({ projectId: "p1", name: "a/b" })).toEqual({ teamId: 3 });
    expect(h.calls).toEqual([]);
  });
});

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
