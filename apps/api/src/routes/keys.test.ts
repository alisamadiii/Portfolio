import { beforeEach, describe, expect, it, vi } from "vitest";

import { encryptSecret } from "../lib/keys.js";
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

function req(
  path: string,
  auth: string,
  init: RequestInit & { json?: unknown } = {}
) {
  const { json, ...rest } = init;
  return app.request(
    path,
    {
      ...rest,
      headers: {
        Authorization: auth,
        ...(json ? { "Content-Type": "application/json" } : {}),
        ...(rest.headers ?? {}),
      },
      ...(json ? { body: JSON.stringify(json) } : {}),
    },
    testEnv,
    testCtx
  );
}

beforeEach(() => {
  dbQueue.length = 0;
});

describe("POST /v1/admin/keys", () => {
  it("400 when neither userId nor email is given", async () => {
    const res = await req("/v1/admin/keys", await admin(), {
      method: "POST",
      json: {},
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });

  it("404 USER_NOT_FOUND for an unknown email", async () => {
    const auth = await admin();
    dbQueue.push([]); // user lookup
    const res = await req("/v1/admin/keys", auth, {
      method: "POST",
      json: { email: "ghost@acme.com" },
    });
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("USER_NOT_FOUND");
  });

  it("201 defaults to a public ak_pub_ key for the user", async () => {
    const auth = await admin();
    const owner = makeUser();
    dbQueue.push([owner]); // user lookup
    dbQueue.push([
      { id: "new-key-id", userId: owner.id, prefix: "ak_pub_012345" },
    ]); // insert returning
    const res = await req("/v1/admin/keys", auth, {
      method: "POST",
      json: { email: owner.email },
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.key).toMatch(/^ak_pub_[0-9a-f]{32}$/);
    expect(body.type).toBe("public");
  });

  it('201 mints an ak_ser_ key when type is "server"', async () => {
    const auth = await admin();
    const owner = makeUser();
    dbQueue.push([owner]); // user lookup
    dbQueue.push([
      { id: "new-key-id", userId: owner.id, prefix: "ak_ser_012345" },
    ]); // insert returning
    const res = await req("/v1/admin/keys", auth, {
      method: "POST",
      json: { email: owner.email, type: "server" },
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.key).toMatch(/^ak_ser_[0-9a-f]{32}$/);
    expect(body.type).toBe("server");
  });

  it("400 for an unknown key type", async () => {
    const res = await req("/v1/admin/keys", await admin(), {
      method: "POST",
      json: { email: "someone@acme.com", type: "admin" },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });
});

describe("POST /v1/admin/keys/migrate-legacy", () => {
  const legacy = (over: Record<string, unknown> = {}) => ({
    id: "legacy-1",
    userId: "user-1",
    prefix: "ak_live_012345",
    email: "client@acme.com",
    ...over,
  });

  it("mints one ak_pub_ key per legacy key without revoking it", async () => {
    const auth = await admin();
    dbQueue.push([legacy()]); // active keys select
    dbQueue.push([{ id: "new-1" }]); // insert returning
    const res = await req("/v1/admin/keys/migrate-legacy", auth, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.migrated).toHaveLength(1);
    expect(body.migrated[0].legacyKeyId).toBe("legacy-1");
    expect(body.migrated[0].newKey).toMatch(/^ak_pub_[0-9a-f]{32}$/);
    // The legacy key must stay usable until its site is updated — the only
    // writes are the inserts, so the queue is fully drained.
    expect(dbQueue).toHaveLength(0);
  });

  it("skips a user who already has an active ak_pub_ key", async () => {
    const auth = await admin();
    dbQueue.push([
      legacy(),
      { ...legacy({ id: "pub-1" }), prefix: "ak_pub_abcdef" },
    ]);
    const res = await req("/v1/admin/keys/migrate-legacy", auth, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.migrated).toHaveLength(0);
    expect(body.skipped).toHaveLength(1);
  });

  it("mints only one new key for a user holding two legacy keys", async () => {
    const auth = await admin();
    dbQueue.push([legacy(), legacy({ id: "legacy-2" })]);
    dbQueue.push([{ id: "new-1" }]); // a single insert
    const res = await req("/v1/admin/keys/migrate-legacy", auth, {
      method: "POST",
    });
    const body = await json(res);
    expect(body.migrated).toHaveLength(1);
    expect(body.skipped).toHaveLength(1);
  });

  it("dryRun reports the work without writing or revealing keys", async () => {
    const auth = await admin();
    dbQueue.push([legacy()]); // active keys select only — no insert queued
    const res = await req("/v1/admin/keys/migrate-legacy?dryRun=1", auth, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.dryRun).toBe(true);
    expect(body.migrated).toEqual([
      expect.objectContaining({ legacyKeyId: "legacy-1", newKey: null }),
    ]);
  });
});

describe("GET /v1/admin/keys/:id/reveal", () => {
  it("404 for an unknown key id", async () => {
    const auth = await admin();
    dbQueue.push([]); // key select
    const res = await req("/v1/admin/keys/nope/reveal", auth);
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("API_KEY_NOT_FOUND");
  });

  it("410 for a revoked key", async () => {
    const auth = await admin();
    dbQueue.push([{ secretEnc: "x", revokedAt: new Date() }]);
    const res = await req("/v1/admin/keys/some-id/reveal", auth);
    expect(res.status).toBe(410);
    expect((await json(res)).error.code).toBe("API_KEY_REVOKED");
  });

  it("200 decrypts the stored key (real AES round-trip)", async () => {
    const auth = await admin();
    const secretEnc = await encryptSecret(
      "ak_live_deadbeef",
      testEnv.KEY_ENC_SECRET
    );
    dbQueue.push([{ secretEnc, revokedAt: null }]);
    const res = await req("/v1/admin/keys/some-id/reveal", auth);
    expect(res.status).toBe(200);
    expect((await json(res)).key).toBe("ak_live_deadbeef");
  });
});

describe("DELETE /v1/admin/keys/:id", () => {
  it("204 on soft revoke", async () => {
    const auth = await admin();
    dbQueue.push([{ id: "some-id" }]); // update returning
    const res = await req("/v1/admin/keys/some-id", auth, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
  });

  it("404 when the key does not exist", async () => {
    const auth = await admin();
    dbQueue.push([]); // update returns nothing
    const res = await req("/v1/admin/keys/nope", auth, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
