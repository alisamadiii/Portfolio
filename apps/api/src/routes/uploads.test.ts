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

const r2Fetch = vi.fn();
const r2Sign = vi.fn();
vi.mock("../lib/r2.js", () => ({
  r2Client: () => ({
    client: { fetch: r2Fetch, sign: r2Sign },
    base: "https://account.r2.cloudflarestorage.com",
  }),
}));

const { app } = await import("../app.js");

const bucketUser = () =>
  makeUser({
    type: "admin", // skip origin gate; bucket config is what's under test
    bucketName: "client-bucket",
    publicBaseUrl: "https://cdn.acme.com",
  });

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
  r2Fetch.mockReset();
  r2Sign.mockReset();
  r2Sign.mockImplementation(async (r: Request) => r);
});

describe("POST /v1/uploads/presign", () => {
  const body = {
    filename: "photo.jpg",
    contentType: "image/jpeg",
    contentLength: 1000,
  };

  it("403 BUCKET_NOT_CONFIGURED without a bucket on the user", async () => {
    const auth = await seedAuth(makeUser({ type: "admin" }));
    const res = await req("/v1/uploads/presign", auth, {
      method: "POST",
      json: body,
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("BUCKET_NOT_CONFIGURED");
  });

  it("200 with uuid naming — no HEAD, key is uuid + extension", async () => {
    const auth = await seedAuth(bucketUser());
    const res = await req("/v1/uploads/presign", auth, {
      method: "POST",
      json: { ...body, naming: "uuid" },
    });
    expect(res.status).toBe(200);
    const out = await json(res);
    expect(out.key).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(out.publicUrl).toBe(`https://cdn.acme.com/${out.key}`);
    expect(r2Fetch).not.toHaveBeenCalled(); // uuid keys never collide
  });

  it("409 FILE_ALREADY_EXISTS in filename mode when HEAD finds the object", async () => {
    const auth = await seedAuth(bucketUser());
    r2Fetch.mockResolvedValue(new Response(null, { status: 200 }));
    const res = await req("/v1/uploads/presign", auth, {
      method: "POST",
      json: body,
    });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("FILE_ALREADY_EXISTS");
  });

  it("200 in filename mode when the object is absent", async () => {
    const auth = await seedAuth(bucketUser());
    r2Fetch.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await req("/v1/uploads/presign", auth, {
      method: "POST",
      json: body,
    });
    expect(res.status).toBe(200);
    expect((await json(res)).key).toBe("photo.jpg");
  });
});

describe("DELETE /v1/uploads", () => {
  it("204 for a bare key and targets the caller's bucket", async () => {
    const auth = await seedAuth(bucketUser());
    r2Fetch.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await req("/v1/uploads", auth, {
      method: "DELETE",
      json: { key: "avatars/photo.jpg" },
    });
    expect(res.status).toBe(204);
    expect(r2Fetch).toHaveBeenCalledWith(
      "https://account.r2.cloudflarestorage.com/client-bucket/avatars/photo.jpg",
      { method: "DELETE" }
    );
  });

  it("resolves any full URL's path to the key (r2.dev host)", async () => {
    const auth = await seedAuth(bucketUser());
    r2Fetch.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await req("/v1/uploads", auth, {
      method: "DELETE",
      json: { key: "https://pub-abc123.r2.dev/round-icon.jpg?x=1" },
    });
    expect(res.status).toBe(204);
    expect(r2Fetch).toHaveBeenCalledWith(
      "https://account.r2.cloudflarestorage.com/client-bucket/round-icon.jpg",
      { method: "DELETE" }
    );
  });

  it("204 even when R2 reports the key missing (idempotent)", async () => {
    const auth = await seedAuth(bucketUser());
    r2Fetch.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await req("/v1/uploads", auth, {
      method: "DELETE",
      json: { key: "ghost.jpg" },
    });
    expect(res.status).toBe(204);
  });

  it("400 INVALID_KEY for a URL without an object path", async () => {
    const auth = await seedAuth(bucketUser());
    const res = await req("/v1/uploads", auth, {
      method: "DELETE",
      json: { key: "https://whatever.com/" },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("INVALID_KEY");
  });

  it("502 when R2 rejects the delete", async () => {
    const auth = await seedAuth(bucketUser());
    r2Fetch.mockResolvedValue(new Response(null, { status: 500 }));
    const res = await req("/v1/uploads", auth, {
      method: "DELETE",
      json: { key: "avatars/photo.jpg" },
    });
    expect(res.status).toBe(502);
    expect((await json(res)).error.code).toBe("STORAGE_DELETE_FAILED");
  });
});
