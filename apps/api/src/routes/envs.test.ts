import { beforeEach, describe, expect, it, vi } from "vitest";

import { encryptSecret } from "../lib/keys.js";
import {
  dbQueue,
  fakeDb,
  flushWaitUntil,
  json,
  makeUser,
  seedAuth,
  testCtx,
  testEnv,
} from "../test/helpers.js";

vi.mock("../db/index.js", () => ({ createDb: () => fakeDb() }));

// The real hash is a fail-closed placeholder until an operator sets it, so the
// suite supplies its own. TEST_PASSWORD's plaintext lives only here.
const TEST_PASSWORD = "correct-horse-battery-staple";
vi.mock("../lib/reveal-password.js", async () => {
  const { hashPassword } = await import("../lib/keys.js");
  const salt = "00112233445566778899aabbccddeeff";
  return {
    REVEAL_PASSWORD_SALT: salt,
    REVEAL_PASSWORD_HASH: await hashPassword(
      "correct-horse-battery-staple",
      salt
    ),
  };
});

const { app } = await import("../app.js");
const { countVars } = await import("./envs.js");

const admin = () => seedAuth(makeUser({ type: "admin" }));

const ENV_TEXT = `# Acme production
DATABASE_URL=postgres://user:pw@host/db

# Payments
STRIPE_SECRET_KEY=sk_live_abc
`;

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

describe("countVars", () => {
  it("counts assignments, ignoring comments and blank lines", () => {
    expect(countVars(ENV_TEXT)).toBe(2);
  });
});

describe("POST /v1/admin/envs", () => {
  it("400 when neither userId nor email is given", async () => {
    const res = await req("/v1/admin/envs", await admin(), {
      method: "POST",
      json: { content: ENV_TEXT },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });

  it("400 when content is missing", async () => {
    const res = await req("/v1/admin/envs", await admin(), {
      method: "POST",
      json: { email: "client@acme.com" },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });

  it("400 when the body tries to set a derived field", async () => {
    const res = await req("/v1/admin/envs", await admin(), {
      method: "POST",
      json: { email: "client@acme.com", content: ENV_TEXT, varCount: 999 },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });

  it("404 USER_NOT_FOUND for an unknown email", async () => {
    const auth = await admin();
    dbQueue.push([]); // user lookup
    const res = await req("/v1/admin/envs", auth, {
      method: "POST",
      json: { email: "ghost@acme.com", content: ENV_TEXT },
    });
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("USER_NOT_FOUND");
  });

  it("201 stores the env encrypted and never echoes the content", async () => {
    const auth = await admin();
    const owner = makeUser();
    dbQueue.push([{ id: owner.id }]); // user lookup
    dbQueue.push([
      {
        id: "env-1",
        userId: owner.id,
        description: "acme production",
        varCount: 2,
      },
    ]); // insert returning
    const res = await req("/v1/admin/envs", auth, {
      method: "POST",
      json: {
        email: owner.email,
        content: ENV_TEXT,
        description: "acme production",
      },
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBe("env-1");
    expect(body.varCount).toBe(2);
    expect(JSON.stringify(body)).not.toContain("sk_live_abc");
    expect(body.contentEnc).toBeUndefined();
  });
});

describe("POST /v1/admin/envs (raw text/plain paste)", () => {
  it("201 takes the body as the file and the owner from the query", async () => {
    const auth = await admin();
    const owner = makeUser();
    dbQueue.push([{ id: owner.id }]); // user lookup
    dbQueue.push([{ id: "env-1", userId: owner.id, varCount: 2 }]);
    const res = await req(
      "/v1/admin/envs?email=client@acme.com&description=acme%20production",
      auth,
      {
        method: "POST",
        body: ENV_TEXT,
        headers: { "Content-Type": "text/plain" },
      }
    );
    expect(res.status).toBe(201);
    expect((await json(res)).varCount).toBe(2);
  });

  it("400 when the raw upload names no user", async () => {
    const res = await req("/v1/admin/envs", await admin(), {
      method: "POST",
      body: ENV_TEXT,
      headers: { "Content-Type": "text/plain" },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });

  it("400 on an empty body", async () => {
    const res = await req(
      "/v1/admin/envs?email=client@acme.com",
      await admin(),
      {
        method: "POST",
        body: "   ",
        headers: { "Content-Type": "text/plain" },
      }
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });
});

describe("POST /v1/admin/envs/:id/reveal", () => {
  const reveal = (auth: string, body: unknown, id = "env-1") =>
    req(`/v1/admin/envs/${id}/reveal`, auth, { method: "POST", json: body });

  it("200 serves the .env as text/plain, byte-for-byte (real AES round-trip)", async () => {
    const auth = await admin();
    const contentEnc = await encryptSecret(ENV_TEXT, testEnv.KEY_ENC_SECRET);
    dbQueue.push([{ contentEnc }]);
    const res = await reveal(auth, { password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(await res.text()).toBe(ENV_TEXT);
  });

  it("404 for an unknown id, once the password is correct", async () => {
    const auth = await admin();
    dbQueue.push([]); // select misses
    const res = await reveal(auth, { password: TEST_PASSWORD }, "nope");
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("ENV_FILE_NOT_FOUND");
  });

  it("400 when no password is supplied", async () => {
    const res = await reveal(await admin(), {});
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });
});

// These are the load-bearing guarantees for this feature: a stored .env is a
// client's entire set of credentials. Each test below stands in for a way that
// plaintext could escape.
describe("security", () => {
  const clientKey = () =>
    seedAuth(makeUser({ allowedOrigins: ["acme.com"] }), {
      prefix: "ak_ser_012345",
    });

  it.each([
    ["GET", "/v1/admin/envs"],
    ["GET", "/v1/admin/envs/env-1"],
    ["POST", "/v1/admin/envs/env-1/reveal"],
    ["POST", "/v1/admin/envs"],
    ["PATCH", "/v1/admin/envs/env-1"],
    ["DELETE", "/v1/admin/envs/env-1"],
  ])(
    "%s %s is 403 ADMIN_REQUIRED for a non-admin key",
    async (method, path) => {
      const auth = await clientKey();
      const res = await req(path, auth, { method });
      expect(res.status).toBe(403);
      expect((await json(res)).error.code).toBe("ADMIN_REQUIRED");
    }
  );

  it("wrong password is 403 and returns no plaintext", async () => {
    const auth = await admin();
    const contentEnc = await encryptSecret(ENV_TEXT, testEnv.KEY_ENC_SECRET);
    dbQueue.push([{ contentEnc }]); // available if the guard were bypassed
    const res = await req("/v1/admin/envs/env-1/reveal", auth, {
      method: "POST",
      json: { password: "wrong" },
    });
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body).not.toContain("sk_live_abc");
    expect(JSON.parse(body).error.code).toBe("ENV_PASSWORD_INVALID");
  });

  // The password is checked before the row lookup, so a wrong password can't be
  // used to probe which env ids exist.
  it("wrong password on an unknown id is 403, not 404", async () => {
    const auth = await admin();
    const res = await req("/v1/admin/envs/does-not-exist/reveal", auth, {
      method: "POST",
      json: { password: "wrong" },
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("ENV_PASSWORD_INVALID");
  });

  // The password is a second factor, never a replacement for the admin guard.
  it("correct password with a non-admin key is still 403 ADMIN_REQUIRED", async () => {
    const auth = await clientKey();
    const res = await req("/v1/admin/envs/env-1/reveal", auth, {
      method: "POST",
      json: { password: TEST_PASSWORD },
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("ADMIN_REQUIRED");
  });

  // The passwordless path must stay gone.
  it("GET /v1/admin/envs/:id/reveal no longer exists", async () => {
    const auth = await admin();
    const res = await req("/v1/admin/envs/env-1/reveal", auth);
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("never sends the reveal password to PostHog", async () => {
    const sent: string[] = [];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_url, init) => {
        sent.push(String(init?.body ?? ""));
        return new Response("ok");
      });
    try {
      const auth = await admin();
      const res = await app.request(
        "/v1/admin/envs/env-1/reveal",
        {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ password: "hunter2-should-never-appear" }),
        },
        { ...testEnv, POSTHOG_API_KEY: "phc_test" },
        testCtx
      );
      expect(res.status).toBe(403);
      await flushWaitUntil();
      // The failed attempt IS reported — that's the signal worth having — but
      // never with the submitted value attached.
      expect(sent.join("")).toContain("ENV_PASSWORD_INVALID");
      for (const body of sent)
        expect(body).not.toContain("hunter2-should-never-appear");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  // There is no client-facing env route, by design. If one is ever added,
  // this test fails and forces the decision to be made deliberately.
  it.each(["/v1/me/envs", "/v1/me/envs/env-1/reveal"])(
    "%s does not exist",
    async (path) => {
      const auth = await clientKey();
      const res = await req(path, auth);
      expect(res.status).toBe(404);
      expect((await json(res)).error.code).toBe("ROUTE_NOT_FOUND");
    }
  );

  // The telemetry middleware buffers JSON bodies and attaches them to
  // $exception events. For env routes that would ship a client's secrets to
  // PostHog on any error, so the body must never be buffered here.
  it("never sends an env upload body to PostHog", async () => {
    const sent: string[] = [];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_url, init) => {
        sent.push(String(init?.body ?? ""));
        return new Response("ok");
      });
    try {
      const auth = await admin();
      dbQueue.push([]); // user lookup misses -> 404 -> onError -> capture
      // capture() no-ops without a key, so configure one to exercise the send.
      const res = await app.request(
        "/v1/admin/envs",
        {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ email: "ghost@acme.com", content: ENV_TEXT }),
        },
        { ...testEnv, POSTHOG_API_KEY: "phc_test" },
        testCtx
      );
      expect(res.status).toBe(404);
      // The error body must not echo the secret either.
      expect(await res.text()).not.toContain("sk_live_abc");
      await flushWaitUntil();
      // Whatever telemetry was sent, none of it carries the .env.
      for (const body of sent) expect(body).not.toContain("sk_live_abc");
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
