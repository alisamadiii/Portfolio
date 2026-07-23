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

beforeEach(() => {
  dbQueue.length = 0;
});

describe("GET /v1/me", () => {
  it("returns the key prefix and the full user", async () => {
    const user = makeUser({ type: "admin" });
    const auth = await seedAuth(user);
    const res = await app.request(
      "/v1/me",
      { headers: { Authorization: auth } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.keyPrefix).toBe("ak_live_012345");
    expect(body.user.email).toBe(user.email);
    expect(body.user.type).toBe("admin");
  });

  it("never leaks keyHash or secretEnc", async () => {
    const auth = await seedAuth(makeUser({ type: "admin" }));
    const res = await app.request(
      "/v1/me",
      { headers: { Authorization: auth } },
      testEnv,
      testCtx
    );
    const raw = await res.text();
    expect(raw).not.toContain("keyHash");
    expect(raw).not.toContain("secretEnc");
  });
});
