import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  dbQueue,
  fakeDb,
  json,
  makeUser,
  seedAuth,
  testCtx,
  testEnv,
} from "../test/helpers.js";

vi.mock("../db/index.js", () => ({ createDb: () => fakeDb() }));

const { app } = await import("../app.js");

const admin = () => seedAuth(makeUser({ type: "admin" }));

function req(path: string, auth: string) {
  return app.request(
    path,
    { headers: { Authorization: auth } },
    testEnv,
    testCtx
  );
}

beforeEach(() => {
  dbQueue.length = 0;
});

const logRow = (over: Record<string, unknown> = {}) => ({
  id: "log-1",
  type: "send",
  fromAddress: "hi@acme.com",
  to: ["someone@example.com"],
  subject: "Hello",
  visitorEmail: null,
  source: null,
  createdAt: new Date("2026-07-01T00:00:00Z"),
  ...over,
});

// The handler awaits four chains inside one Promise.all, so the queue pops in
// array order: byType groups, thisMonth count, latest max, rows.
function seedLogs({
  byType = [] as { type: string; count: number }[],
  thisMonth = 0,
  lastSentAt = null as Date | null,
  rows = [] as unknown[],
} = {}) {
  dbQueue.push(byType);
  dbQueue.push([{ count: thisMonth }]);
  dbQueue.push([{ lastSentAt }]);
  dbQueue.push(rows);
}

describe("GET /v1/admin/email-logs", () => {
  it("400 MISSING_USERID_PARAM without userId", async () => {
    const res = await req("/v1/admin/email-logs", await admin());
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("MISSING_USERID_PARAM");
  });

  it("403 for a non-admin key", async () => {
    // Server key: passes the origin check, then fails the admin gate.
    const auth = await seedAuth(makeUser(), { prefix: "ak_ser_012345" });
    const res = await req("/v1/admin/email-logs?userId=user-1", auth);
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("ADMIN_REQUIRED");
  });

  it("200 aggregates stats and returns recent rows", async () => {
    const auth = await admin();
    const lastSentAt = new Date("2026-07-20T12:00:00Z");
    seedLogs({
      byType: [
        { type: "send", count: 2 },
        { type: "contact", count: 1 },
        // Custom types must be counted too — the old shape silently dropped them.
        { type: "newsletter", count: 4 },
      ],
      thisMonth: 2,
      lastSentAt,
      rows: [logRow(), logRow({ id: "log-2", type: "contact" })],
    });
    const res = await req("/v1/admin/email-logs?userId=user-1", auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.stats).toEqual({
      total: 7,
      thisMonth: 2,
      byType: { send: 2, contact: 1, newsletter: 4 },
      lastSentAt: lastSentAt.toISOString(),
    });
    expect(body.emails).toHaveLength(2);
    expect(body.emails[0].fromAddress).toBe("hi@acme.com");
    // All four queued result sets consumed in order.
    expect(dbQueue).toHaveLength(0);
  });

  it("200 empty stats for a user with no logs", async () => {
    const auth = await admin();
    seedLogs();
    const res = await req("/v1/admin/email-logs?userId=ghost", auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.stats).toEqual({
      total: 0,
      thisMonth: 0,
      byType: {},
      lastSentAt: null,
    });
    expect(body.emails).toEqual([]);
  });
});
