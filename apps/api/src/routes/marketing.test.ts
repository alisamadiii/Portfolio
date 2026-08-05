import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dbQueue,
  fakeDb,
  json,
  makeUser,
  seedAuth,
  testCtx,
  testEnv,
} from "../test/helpers.js";
import type { Env } from "../env.js";

vi.mock("../db/index.js", () => ({ createDb: () => fakeDb() }));

const sendMarketingViaSes = vi.fn();
vi.mock("../lib/ses-v2.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendMarketingViaSes: (...args: unknown[]) => sendMarketingViaSes(...args),
}));

const r2Fetch = vi.fn();
vi.mock("../lib/r2.js", () => ({
  r2Client: () => ({
    client: { fetch: r2Fetch, sign: vi.fn() },
    base: "https://account.r2.cloudflarestorage.com",
  }),
}));

const { app } = await import("../app.js");
const { signUnsubToken, verifyUnsubToken } = await import(
  "../lib/unsub-token.js"
);
const { personalize, wrapMarketingHtml } = await import(
  "../lib/marketing-template.js"
);

const marketingEnv = {
  ...testEnv,
  MARKETING_UNSUB_SECRET: "test-unsub-secret",
  MARKETING_SNS_SECRET: "test-sns-secret",
  SEND_CAMPAIGN: {
    create: vi.fn().mockResolvedValue({}),
    get: vi.fn(),
  } as unknown as Env["SEND_CAMPAIGN"],
} as Env;

const CAMPAIGN_ID = "33333333-3333-3333-3333-333333333333";
const CONTACT_ID = "44444444-4444-4444-4444-444444444444";

const makeCampaignRow = (overrides: Record<string, unknown> = {}) => ({
  campaign: {
    id: CAMPAIGN_ID,
    userId: "11111111-1111-1111-1111-111111111111",
    name: "March newsletter",
    subject: "Hello",
    fromAddress: null,
    editor: "rich",
    contentJson: null,
    html: "<p>Hi {{first_name}}</p>",
    status: "draft",
    ...overrides,
  },
  owner: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "client@acme.com",
    name: "Client",
    role: "user",
  },
  settings: {
    userId: "11111111-1111-1111-1111-111111111111",
    fromName: "Acme",
    fromEmail: "news@acme.com",
    replyTo: null,
    postalAddress: "1 Main St, Springfield",
  },
  apiSettings: { emailDomain: "acme.com" },
});

function req(
  path: string,
  init: RequestInit & { json?: unknown; auth?: string } = {}
) {
  const { json, auth, ...rest } = init;
  return app.request(
    path,
    {
      ...rest,
      headers: {
        ...(auth ? { Authorization: auth, Origin: "https://acme.com" } : {}),
        ...(json ? { "Content-Type": "application/json" } : {}),
      },
      ...(json ? { body: JSON.stringify(json) } : {}),
    },
    marketingEnv,
    testCtx
  );
}

beforeEach(() => {
  dbQueue.length = 0;
  sendMarketingViaSes.mockReset().mockResolvedValue("ses-v2-message-id");
  r2Fetch.mockReset().mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("unsub tokens", () => {
  it("round-trips sign → verify", async () => {
    const token = await signUnsubToken(marketingEnv, CONTACT_ID);
    expect(await verifyUnsubToken(marketingEnv, CONTACT_ID, token)).toBe(true);
  });

  it("rejects a tampered token and a foreign contact id", async () => {
    const token = await signUnsubToken(marketingEnv, CONTACT_ID);
    expect(
      await verifyUnsubToken(marketingEnv, CONTACT_ID, token.slice(0, -1) + "0")
    ).toBe(false);
    expect(await verifyUnsubToken(marketingEnv, "other-contact", token)).toBe(
      false
    );
    expect(await verifyUnsubToken(marketingEnv, CONTACT_ID, "")).toBe(false);
  });
});

describe("marketing templates", () => {
  it("wraps rich content in the shell and keeps the unsubscribe token", () => {
    const html = wrapMarketingHtml({
      body: "<p>Hi</p>",
      editor: "rich",
      fromName: "Acme",
      postalAddress: "1 Main St",
    });
    expect(html).toContain("<p>Hi</p>");
    expect(html).toContain("1 Main St");
    expect(html).toContain("{{unsubscribe_url}}");
  });

  it("only appends the footer to raw-HTML campaigns", () => {
    const html = wrapMarketingHtml({
      body: "<html><body><h1>Custom</h1></body></html>",
      editor: "html",
      postalAddress: "1 Main St",
    });
    expect(html.startsWith("<html>")).toBe(true);
    expect(html).toContain("{{unsubscribe_url}}");
    expect(html.indexOf("Unsubscribe")).toBeLessThan(html.indexOf("</body>"));
  });

  it("personalizes tokens and escapes contact values", () => {
    const out = personalize(
      "<p>Hi {{first_name}} ({{email}})</p><a href='{{unsubscribe_url}}'>x</a>",
      { email: "a@b.com", firstName: "<script>" },
      "https://api.example.com/u"
    );
    expect(out).toContain("Hi &lt;script&gt;");
    expect(out).toContain("a@b.com");
    expect(out).toContain("https://api.example.com/u");
    expect(out).not.toContain("{{");
  });
});

describe("POST /v1/marketing/campaigns/:id/send", () => {
  it("409 CAMPAIGN_NOT_DRAFT for a non-draft campaign", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    dbQueue.push([makeCampaignRow({ status: "sending" })]);
    const res = await req(`/v1/marketing/campaigns/${CAMPAIGN_ID}/send`, {
      method: "POST",
      auth,
      json: {},
    });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("CAMPAIGN_NOT_DRAFT");
  });

  it("400 MARKETING_SETTINGS_INCOMPLETE without a postal address", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    const row = makeCampaignRow();
    row.settings.postalAddress = null as never;
    dbQueue.push([row]);
    const res = await req(`/v1/marketing/campaigns/${CAMPAIGN_ID}/send`, {
      method: "POST",
      auth,
      json: {},
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("MARKETING_SETTINGS_INCOMPLETE");
  });

  it("403 SENDER_DOMAIN_MISMATCH for a foreign from address", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    const row = makeCampaignRow();
    row.settings.fromEmail = "news@evil.com" as never;
    dbQueue.push([row]);
    const res = await req(`/v1/marketing/campaigns/${CAMPAIGN_ID}/send`, {
      method: "POST",
      auth,
      json: {},
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("SENDER_DOMAIN_MISMATCH");
  });

  it("403 when a non-admin key passes userId", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    const res = await req(`/v1/marketing/campaigns/${CAMPAIGN_ID}/send`, {
      method: "POST",
      auth,
      json: { userId: "someone-else" },
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("ADMIN_REQUIRED");
  });

  it("404 CAMPAIGN_NOT_FOUND for a foreign campaign", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    dbQueue.push([]); // loadCampaign finds nothing for this user
    const res = await req(`/v1/marketing/campaigns/${CAMPAIGN_ID}/send`, {
      method: "POST",
      auth,
      json: {},
    });
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("CAMPAIGN_NOT_FOUND");
  });
});

describe("POST /v1/marketing/subscribe", () => {
  it("upserts the visitor into the key owner's list", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    dbQueue.push([{ id: CONTACT_ID }]); // insert…onConflictDoUpdate returning
    const res = await req("/v1/marketing/subscribe", {
      method: "POST",
      auth,
      json: { email: "Visitor@Example.com", firstName: "Vis" },
    });
    expect(res.status).toBe(201);
    expect(await json(res)).toEqual({ id: CONTACT_ID, status: "subscribed" });
  });

  it("400 VALIDATION_FAILED for a bad email", async () => {
    const auth = await seedAuth(makeUser({ allowedOrigins: ["acme.com"] }));
    const res = await req("/v1/marketing/subscribe", {
      method: "POST",
      auth,
      json: { email: "not-an-email" },
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_FAILED");
  });
});

describe("GET/POST /v1/marketing/unsubscribe", () => {
  it("GET with a bad token renders the invalid page, no mutation", async () => {
    const res = await req(
      `/v1/marketing/unsubscribe?c=${CONTACT_ID}&t=bogus`
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("invalid");
  });

  it("GET with a valid token renders a confirm form (never mutates)", async () => {
    const token = await signUnsubToken(marketingEnv, CONTACT_ID);
    const res = await req(
      `/v1/marketing/unsubscribe?c=${CONTACT_ID}&t=${token}`
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<form method=\"post\"");
    expect(dbQueue.length).toBe(0); // nothing consumed → nothing queued needed
  });

  it("POST with a valid token unsubscribes the contact", async () => {
    const token = await signUnsubToken(marketingEnv, CONTACT_ID);
    dbQueue.push([]); // the update chain
    const res = await req(
      `/v1/marketing/unsubscribe?c=${CONTACT_ID}&t=${token}`,
      { method: "POST" }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed");
  });
});

describe("POST /v1/marketing/sns/:secret", () => {
  const snsBody = (message: unknown) => ({
    Type: "Notification",
    Message: JSON.stringify(message),
  });

  it("403 on a wrong path secret", async () => {
    const res = await req("/v1/marketing/sns/wrong-secret", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it("confirms subscriptions only for amazonaws.com hosts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const ok = await req("/v1/marketing/sns/test-sns-secret", {
      method: "POST",
      body: JSON.stringify({
        Type: "SubscriptionConfirmation",
        SubscribeURL: "https://sns.us-east-1.amazonaws.com/?Action=Confirm",
      }),
    });
    expect(ok.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();

    const bad = await req("/v1/marketing/sns/test-sns-secret", {
      method: "POST",
      body: JSON.stringify({
        Type: "SubscriptionConfirmation",
        SubscribeURL: "https://evil.example.com/steal",
      }),
    });
    expect(bad.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("suppresses permanent bounces", async () => {
    dbQueue.push([]); // suppression insert
    const res = await req("/v1/marketing/sns/test-sns-secret", {
      method: "POST",
      body: JSON.stringify(
        snsBody({
          notificationType: "Bounce",
          bounce: {
            bounceType: "Permanent",
            bounceSubType: "General",
            bouncedRecipients: [{ emailAddress: "Dead@Example.com" }],
          },
          mail: { tags: { userId: ["11111111-1111-1111-1111-111111111111"] } },
        })
      ),
    });
    expect(res.status).toBe(200);
    expect(dbQueue.length).toBe(0); // insert chain consumed
  });

  it("ignores transient bounces", async () => {
    const res = await req("/v1/marketing/sns/test-sns-secret", {
      method: "POST",
      body: JSON.stringify(
        snsBody({
          notificationType: "Bounce",
          bounce: {
            bounceType: "Transient",
            bouncedRecipients: [{ emailAddress: "full@example.com" }],
          },
        })
      ),
    });
    expect(res.status).toBe(200);
    expect(dbQueue.length).toBe(0); // nothing pushed, nothing consumed
  });

  it("suppresses complaints and unsubscribes the source contact", async () => {
    dbQueue.push([]); // suppression insert
    dbQueue.push([]); // contact unsubscribe update
    const res = await req("/v1/marketing/sns/test-sns-secret", {
      method: "POST",
      body: JSON.stringify(
        snsBody({
          eventType: "Complaint",
          complaint: {
            complaintFeedbackType: "abuse",
            complainedRecipients: [{ emailAddress: "angry@example.com" }],
          },
          mail: { tags: { userId: ["11111111-1111-1111-1111-111111111111"] } },
        })
      ),
    });
    expect(res.status).toBe(200);
    expect(dbQueue.length).toBe(0); // both chains consumed
  });
});
