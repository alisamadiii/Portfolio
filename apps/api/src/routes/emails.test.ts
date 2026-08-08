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

const sendViaSes = vi.fn();
vi.mock("../lib/ses.js", () => ({
  sendViaSes: (...args: unknown[]) => sendViaSes(...args),
}));

const logEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/email-log.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  logEmail: (...args: unknown[]) => logEmail(...args),
}));

const r2Sign = vi.fn();
vi.mock("../lib/r2.js", () => ({
  r2Client: () => ({
    client: { fetch: vi.fn(), sign: r2Sign },
    base: "https://account.r2.cloudflarestorage.com",
  }),
}));

const { app } = await import("../app.js");

const domainUser = () =>
  makeUser({ emailDomain: "acme.com", allowedOrigins: ["acme.com"] });

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
        Origin: "https://acme.com",
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
  sendViaSes.mockReset().mockResolvedValue("ses-message-id");
  logEmail.mockClear();
  r2Sign.mockReset();
});

describe("POST /v1/emails/send", () => {
  const body = {
    from: "noreply@acme.com",
    to: "someone@example.com",
    subject: "Hi",
    html: "<p>Hi</p>",
  };

  it("403 EMAIL_DOMAIN_NOT_CONFIGURED without emailDomain", async () => {
    const auth = await seedAuth(
      makeUser({ allowedOrigins: ["acme.com"], emailDomain: null })
    );
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: body,
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("EMAIL_DOMAIN_NOT_CONFIGURED");
    expect(sendViaSes).not.toHaveBeenCalled();
  });

  it("403 SENDER_DOMAIN_MISMATCH for a foreign from address", async () => {
    const auth = await seedAuth(domainUser());
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: { ...body, from: "noreply@evil.com" },
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("SENDER_DOMAIN_MISMATCH");
  });

  it("admin may send from any domain", async () => {
    const auth = await seedAuth(makeUser({ type: "admin" }));
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: { ...body, from: "anything@other.com" },
    });
    expect(res.status).toBe(202);
  });

  it("202 sends and logs the email with type send", async () => {
    const auth = await seedAuth(domainUser());
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: body,
    });
    expect(res.status).toBe(202);
    const bodyOut = await json(res);
    expect(logEmail).toHaveBeenCalledTimes(1);
    const args = logEmail.mock.calls[0][1] as Record<string, unknown>;
    // id = the DB row id (matches the id logEmail persists); messageId = SES.
    expect(bodyOut.id).toBe(args.id);
    expect(bodyOut.messageId).toBe("ses-message-id");
    expect(typeof bodyOut.id).toBe("string");
    expect(bodyOut.id).not.toBe("ses-message-id");
    expect(args.type).toBe("send");
    expect(args.messageId).toBe("ses-message-id");
    expect(args.to).toEqual(["someone@example.com"]);
  });

  it("202 logs a custom type when the caller passes one", async () => {
    const auth = await seedAuth(domainUser());
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: { ...body, type: "newsletter" },
    });
    expect(res.status).toBe(202);
    const args = logEmail.mock.calls[0][1] as Record<string, unknown>;
    expect(args.type).toBe("newsletter");
  });

  it("400 VALIDATION_FAILED for an empty type", async () => {
    const auth = await seedAuth(domainUser());
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: { ...body, type: "" },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
    expect(sendViaSes).not.toHaveBeenCalled();
  });

  it("202 forwards attachments to the sender", async () => {
    const auth = await seedAuth(domainUser());
    const attachments = [
      { filename: "a.txt", content: "aGVsbG8=", contentType: "text/plain" },
    ];
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: { ...body, attachments },
    });
    expect(res.status).toBe(202);
    const sesArgs = sendViaSes.mock.calls[0][1] as Record<string, unknown>;
    expect(sesArgs.attachments).toEqual(attachments);
  });

  it("400 VALIDATION_FAILED when attachments exceed 1 MB combined", async () => {
    const auth = await seedAuth(domainUser());
    // ~1.5 MB of base64 → ~1.1 MB decoded, over the limit. Rejected by the
    // schema refine, so sendViaSes is never called (no MIME allocation).
    const content = "A".repeat(1_500_000);
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: { ...body, attachments: [{ filename: "big.bin", content }] },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
    expect(sendViaSes).not.toHaveBeenCalled();
  });

  it("400 VALIDATION_FAILED for non-base64 attachment content", async () => {
    const auth = await seedAuth(domainUser());
    const res = await req("/v1/emails/send", auth, {
      method: "POST",
      json: {
        ...body,
        attachments: [{ filename: "a.txt", content: "not base64!!" }],
      },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
    expect(sendViaSes).not.toHaveBeenCalled();
  });
});

describe("POST /v1/emails/contact", () => {
  const body = { name: "Jane", email: "jane@example.com", message: "Hello!" };

  it("403 without emailDomain", async () => {
    const auth = await seedAuth(
      makeUser({ allowedOrigins: ["acme.com"], emailDomain: null })
    );
    const res = await req("/v1/emails/contact", auth, {
      method: "POST",
      json: body,
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("EMAIL_DOMAIN_NOT_CONFIGURED");
  });

  it("202 delivers to the account owner and logs type contact", async () => {
    const user = domainUser();
    const auth = await seedAuth(user);
    const res = await req("/v1/emails/contact", auth, {
      method: "POST",
      json: body,
    });
    expect(res.status).toBe(202);
    // Recipient is always the key owner — caller can never choose it.
    const sesArgs = sendViaSes.mock.calls[0][1] as Record<string, unknown>;
    expect(sesArgs.to).toEqual([user.email]);
    expect(sesArgs.replyTo).toBe("jane@example.com");
    const logArgs = logEmail.mock.calls[0][1] as Record<string, unknown>;
    expect(logArgs.type).toBe("contact");
    expect(logArgs.visitorEmail).toBe("jane@example.com");
    const bodyOut = await json(res);
    expect(bodyOut.id).toBe(logArgs.id);
    expect(bodyOut.messageId).toBe("ses-message-id");
  });
});

describe("GET /v1/emails", () => {
  it("returns the caller's history", async () => {
    const auth = await seedAuth(domainUser());
    dbQueue.push([
      { id: "log-1", type: "send", subject: "Hi", to: ["a@b.com"] },
    ]);
    const res = await req("/v1/emails", auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.emails).toHaveLength(1);
    expect(body.emails[0].id).toBe("log-1");
  });

  it("400 INVALID_CURSOR for a malformed before param", async () => {
    const auth = await seedAuth(domainUser());
    const res = await req("/v1/emails?before=not-a-date", auth);
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("INVALID_CURSOR");
  });
});

describe("GET /v1/emails/:id/html", () => {
  it("404 EMAIL_NOT_FOUND when the row belongs to another user", async () => {
    const auth = await seedAuth(domainUser());
    dbQueue.push([{ userId: "someone-else", r2Key: "x/y.html" }]);
    const res = await req("/v1/emails/log-1/html", auth);
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("EMAIL_NOT_FOUND");
  });

  it("200 returns a presigned url for the caller's email", async () => {
    const user = domainUser();
    const auth = await seedAuth(user);
    dbQueue.push([{ userId: user.id, r2Key: `${user.id}/2026-07/log-1.html` }]);
    r2Sign.mockImplementation(async (r: Request) => r);
    const res = await req("/v1/emails/log-1/html", auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.expiresIn).toBe(60);
    expect(body.url).toContain(`/emails/${user.id}/2026-07/log-1.html`);
  });

  it("admin may fetch any user's email html", async () => {
    const auth = await seedAuth(makeUser({ type: "admin" }));
    dbQueue.push([{ userId: "someone-else", r2Key: "x/y.html" }]);
    r2Sign.mockImplementation(async (r: Request) => r);
    const res = await req("/v1/emails/log-1/html", auth);
    expect(res.status).toBe(200);
  });
});
