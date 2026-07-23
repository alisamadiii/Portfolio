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

// /v1/me is the simplest authed endpoint — used to exercise requireAuth.
const ME = "/v1/me";

beforeEach(() => {
  dbQueue.length = 0;
});

describe("requireAuth", () => {
  it("401 MISSING_API_KEY without Authorization header", async () => {
    const res = await app.request(ME, {}, testEnv, testCtx);
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("MISSING_API_KEY");
  });

  it("401 UNKNOWN_API_KEY when the hash matches no row", async () => {
    dbQueue.push([]); // join select finds nothing
    const res = await app.request(
      ME,
      { headers: { Authorization: "Bearer ak_live_nope" } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("UNKNOWN_API_KEY");
  });

  it("401 API_KEY_REVOKED for a revoked key", async () => {
    const auth = await seedAuth(makeUser(), {
      revokedAt: new Date("2026-06-01T00:00:00Z"),
    });
    const res = await app.request(
      ME,
      { headers: { Authorization: auth } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("API_KEY_REVOKED");
  });

  it("403 ACCESS_DENIED for non-admin without Origin header", async () => {
    const auth = await seedAuth(
      makeUser({ allowedOrigins: ["https://acme.com"] })
    );
    const res = await app.request(
      ME,
      { headers: { Authorization: auth } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.error.code).toBe("ACCESS_DENIED");
    // Deliberately vague — must not leak the allowlist mechanics.
    expect(JSON.stringify(body)).not.toMatch(/origin/i);
  });

  it("403 ACCESS_DENIED for an origin not in the allowlist", async () => {
    const auth = await seedAuth(
      makeUser({ allowedOrigins: ["https://acme.com"] })
    );
    const res = await app.request(
      ME,
      { headers: { Authorization: auth, Origin: "https://evil.com" } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("ACCESS_DENIED");
  });

  it("403 ACCESS_DENIED when the user has no origins configured", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: [] }));
    const res = await app.request(
      ME,
      { headers: { Authorization: auth, Origin: "https://acme.com" } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("ACCESS_DENIED");
  });

  it("allows an exact-origin match", async () => {
    const auth = await seedAuth(
      makeUser({ allowedOrigins: ["https://acme.com"] })
    );
    const res = await app.request(
      ME,
      { headers: { Authorization: auth, Origin: "https://acme.com" } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(200);
  });

  it("bare-domain rule matches any scheme and subdomain", async () => {
    for (const origin of [
      "https://acme.com",
      "http://acme.com",
      "https://www.acme.com",
    ]) {
      dbQueue.length = 0;
      const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
      const res = await app.request(
        ME,
        { headers: { Authorization: auth, Origin: origin } },
        testEnv,
        testCtx
      );
      expect(res.status, origin).toBe(200);
    }
  });

  it("bare-domain rule rejects suffix-spoofing hosts", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    const res = await app.request(
      ME,
      { headers: { Authorization: auth, Origin: "https://acme.com.evil.com" } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(403);
  });

  // ak_ser_ keys are held server-side, so there's no origin to check. The
  // ak_pub_ counterpart of each case is asserted alongside it, so these prove
  // the gate keys off the prefix and not off something incidental.
  describe("server keys (ak_ser_)", () => {
    const SERVER = { prefix: "ak_ser_012345" };
    const PUBLIC = { prefix: "ak_pub_012345" };

    it("allows a server key with no Origin header", async () => {
      const auth = await seedAuth(
        makeUser({ allowedOrigins: ["https://acme.com"] }),
        SERVER
      );
      const res = await app.request(
        ME,
        { headers: { Authorization: auth } },
        testEnv,
        testCtx
      );
      expect(res.status).toBe(200);
      expect((await json(res)).keyType).toBe("server");
    });

    it("allows a server key from an origin outside the allowlist", async () => {
      const auth = await seedAuth(
        makeUser({ allowedOrigins: ["https://acme.com"] }),
        SERVER
      );
      const res = await app.request(
        ME,
        { headers: { Authorization: auth, Origin: "https://evil.com" } },
        testEnv,
        testCtx
      );
      expect(res.status).toBe(200);
    });

    it("allows a server key when the user has no origins configured", async () => {
      const auth = await seedAuth(makeUser({ allowedOrigins: [] }), SERVER);
      const res = await app.request(
        ME,
        { headers: { Authorization: auth } },
        testEnv,
        testCtx
      );
      expect(res.status).toBe(200);
    });

    it("still gates an ak_pub_ key in each of those cases", async () => {
      const cases: [string, Record<string, string>, string[]][] = [
        ["no Origin", {}, ["https://acme.com"]],
        [
          "unlisted Origin",
          { Origin: "https://evil.com" },
          ["https://acme.com"],
        ],
        ["empty allowlist", { Origin: "https://acme.com" }, []],
      ];
      for (const [name, headers, allowedOrigins] of cases) {
        dbQueue.length = 0;
        const auth = await seedAuth(makeUser({ allowedOrigins }), PUBLIC);
        const res = await app.request(
          ME,
          { headers: { Authorization: auth, ...headers } },
          testEnv,
          testCtx
        );
        expect(res.status, name).toBe(403);
        expect((await json(res)).error.code, name).toBe("ACCESS_DENIED");
      }
    });

    it("treats a legacy ak_live_ key as public, not server", async () => {
      const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }), {
        prefix: "ak_live_012345",
      });
      const res = await app.request(
        ME,
        { headers: { Authorization: auth } },
        testEnv,
        testCtx
      );
      expect(res.status).toBe(403);
    });
  });

  it("admin keys skip the origin check", async () => {
    const auth = await seedAuth(
      makeUser({ type: "admin", allowedOrigins: [] })
    );
    const res = await app.request(
      ME,
      { headers: { Authorization: auth } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(200);
  });
});

describe("requireAdmin", () => {
  it("403 ADMIN_REQUIRED for a non-admin user's key", async () => {
    // Admin routes: user type "user" passes requireAuth (needs an origin).
    const auth = await seedAuth(
      makeUser({ allowedOrigins: ["https://acme.com"] })
    );
    const res = await app.request(
      "/v1/admin/users",
      { headers: { Authorization: auth, Origin: "https://acme.com" } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("ADMIN_REQUIRED");
  });

  it("admin passes through to the admin router", async () => {
    const auth = await seedAuth(makeUser({ type: "admin" }));
    dbQueue.push([]); // users list select
    const res = await app.request(
      "/v1/admin/users",
      { headers: { Authorization: auth } },
      testEnv,
      testCtx
    );
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual([]);
  });
});
