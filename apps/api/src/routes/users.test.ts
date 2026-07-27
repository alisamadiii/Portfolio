import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  dbQueue,
  fakeDb,
  json,
  makeUser,
  seedAuth,
  splitApiUser,
  testCtx,
  testEnv,
} from "../test/helpers.js";

vi.mock("../db/index.js", () => ({ createDb: () => fakeDb() }));
// Bucket/domain pre-flight hits R2 + SES — not under test here.
vi.mock("../lib/verify.js", () => ({
  verifyBucketExists: vi.fn().mockResolvedValue(undefined),
  verifyPublicBaseUrl: vi.fn().mockResolvedValue(undefined),
  verifyEmailDomain: vi.fn().mockResolvedValue(undefined),
}));

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

describe("POST /v1/admin/users", () => {
  it("400 when bucketName is set without publicBaseUrl", async () => {
    const res = await req("/v1/admin/users", await admin(), {
      method: "POST",
      json: { email: "a@b.com", bucketName: "solo-bucket" },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.message).toContain("must be set together");
  });

  it('400 for invalid allowedOrigins entries ("*", origin with path)', async () => {
    for (const bad of ["*", "https://acme.com/path", "Acme.com"]) {
      dbQueue.length = 0;
      const res = await req("/v1/admin/users", await admin(), {
        method: "POST",
        json: { email: "a@b.com", allowedOrigins: [bad] },
      });
      expect(res.status, bad).toBe(400);
      expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
    }
  });

  it("201 creates the user and mints a key", async () => {
    const auth = await admin();
    const created = splitApiUser(makeUser({ email: "new@acme.com" }));
    dbQueue.push([]); // existing-account lookup: none
    dbQueue.push([created.user]); // insert user returning
    dbQueue.push([created.settings]); // insert settings returning
    dbQueue.push([{ id: "key-row-id" }]); // insert key returning
    const res = await req("/v1/admin/users", auth, {
      method: "POST",
      json: { email: "new@acme.com", allowedOrigins: ["acme.com"] },
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.email).toBe("new@acme.com");
    expect(body.apiKey.key).toMatch(/^ak_pub_[0-9a-f]{32}$/);
    expect(body.apiKey.type).toBe("public");
  });

  it("201 mints a server key when keyType is server", async () => {
    const auth = await admin();
    const created = splitApiUser(makeUser({ email: "svc@acme.com" }));
    dbQueue.push([]); // existing-account lookup: none
    dbQueue.push([created.user]); // insert user returning
    dbQueue.push([created.settings]); // insert settings returning
    dbQueue.push([{ id: "key-row-id" }]); // insert key returning
    const res = await req("/v1/admin/users", auth, {
      method: "POST",
      json: { email: "svc@acme.com", keyType: "server" },
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.apiKey.key).toMatch(/^ak_ser_[0-9a-f]{32}$/);
    expect(body.apiKey.type).toBe("server");
    // keyType is not a column — it must not leak into the row.
    expect(body.keyType).toBeUndefined();
  });

  it("409 DUPLICATE_EMAIL when the account already has API settings", async () => {
    const auth = await admin();
    const dupe = splitApiUser(makeUser({ email: "dupe@acme.com" }));
    dbQueue.push([{ user: dupe.user, settings: dupe.settings }]); // existing-account lookup
    const res = await req("/v1/admin/users", auth, {
      method: "POST",
      json: { email: "dupe@acme.com" },
    });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("DUPLICATE_EMAIL");
  });

  it("409 DUPLICATE_EMAIL on unique violation", async () => {
    const auth = await admin();
    dbQueue.push([]); // existing-account lookup: none
    dbQueue.push(Object.assign(new Error("duplicate"), { code: "23505" }));
    const res = await req("/v1/admin/users", auth, {
      method: "POST",
      json: { email: "dupe@acme.com" },
    });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("DUPLICATE_EMAIL");
  });

  it("201 attaches API access to an existing portfolio account", async () => {
    const auth = await admin();
    const existing = splitApiUser(makeUser({ email: "old@acme.com" }));
    dbQueue.push([{ user: existing.user, settings: null }]); // account without settings
    dbQueue.push([existing.user]); // update user returning
    dbQueue.push([existing.settings]); // insert settings returning
    dbQueue.push([{ id: "key-row-id" }]); // insert key returning
    const res = await req("/v1/admin/users", auth, {
      method: "POST",
      json: { email: "old@acme.com" },
    });
    expect(res.status).toBe(201);
    expect((await json(res)).email).toBe("old@acme.com");
  });
});

describe("PATCH /v1/admin/users/:id", () => {
  it("400 when no fields are provided", async () => {
    const res = await req("/v1/admin/users/some-id", await admin(), {
      method: "PATCH",
      json: {},
    });
    expect(res.status).toBe(400);
  });

  it("404 when the user does not exist", async () => {
    const auth = await admin();
    dbQueue.push([]); // update returning nothing
    const res = await req("/v1/admin/users/nope", auth, {
      method: "PATCH",
      json: { name: "New Name" },
    });
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("USER_NOT_FOUND");
  });
});

describe("GET /v1/admin/users/lookup", () => {
  it("400 MISSING_EMAIL_PARAM without ?email", async () => {
    const res = await req("/v1/admin/users/lookup", await admin());
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("MISSING_EMAIL_PARAM");
  });
});

describe("DELETE /v1/admin/users/:id", () => {
  it("404 when the user does not exist", async () => {
    const auth = await admin();
    dbQueue.push([]); // delete returning nothing
    const res = await req("/v1/admin/users/nope", auth, { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("204 on delete", async () => {
    const auth = await admin();
    dbQueue.push([{ id: "some-id" }]);
    const res = await req("/v1/admin/users/some-id", auth, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
  });
});
