import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import {
  WIX_APPS,
  isMarkdownSafe,
  signWixState,
  submissionToLead,
  verifySignedInstance,
  verifyWixState,
} from "@workspace/trpc/lib/wix-shared";

const SECRET = "app-secret";

const signInstance = (data: object, secret = SECRET) => {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${sig}.${payload}`;
};

describe("verifySignedInstance", () => {
  it("accepts an instance signed with the app secret", () => {
    const signed = signInstance({ instanceId: "inst-1", appDefId: "app-1" });
    expect(verifySignedInstance(signed, SECRET)).toMatchObject({ instanceId: "inst-1", appDefId: "app-1" });
  });

  it("rejects another secret, a tampered payload or a missing part", () => {
    const signed = signInstance({ instanceId: "inst-1" });
    expect(verifySignedInstance(signed, "other")).toBeNull();
    const [sig] = signed.split(".");
    const forged = Buffer.from(JSON.stringify({ instanceId: "inst-2" })).toString("base64url");
    expect(verifySignedInstance(`${sig}.${forged}`, SECRET)).toBeNull();
    expect(verifySignedInstance("nodot", SECRET)).toBeNull();
    expect(verifySignedInstance(signed, "")).toBeNull();
  });

  it("rejects a signed payload without an instanceId", () => {
    expect(verifySignedInstance(signInstance({ appDefId: "x" }), SECRET)).toBeNull();
  });
});

describe("Wix install state", () => {
  const data = { projectId: "11111111-1111-1111-1111-111111111111", userId: "u1" };

  it("round-trips", () => {
    expect(verifyWixState(signWixState(data, SECRET), SECRET)).toMatchObject(data);
  });

  it("rejects a wrong secret, tampering and expiry", () => {
    const token = signWixState(data, SECRET);
    expect(verifyWixState(token, "other")).toBeNull();
    const [, sig] = token.split(".");
    const other = Buffer.from(JSON.stringify({ ...data, userId: "u2", exp: 9e9 })).toString("base64url");
    expect(verifyWixState(`${other}.${sig}`, SECRET)).toBeNull();
    const old = signWixState(data, SECRET, Date.now() - 31 * 60 * 1000);
    expect(verifyWixState(old, SECRET)).toBeNull();
  });
});

describe("submissionToLead", () => {
  it("joins first + last name and finds email, phone, message with Wix key suffixes", () => {
    expect(
      submissionToLead({
        first_name_a1b2: "Ada",
        last_name_c3d4: "Lovelace",
        email_5e6f: "ada@example.com",
        phone_7g8h: "555-0100",
        message_9i0j: "Need a quote",
        budget: "500",
      })
    ).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "555-0100",
      message: "Need a quote",
      rest: { budget: "500" },
    });
  });

  it("keeps an invalid email out of email, and skips empty values", () => {
    const lead = submissionToLead({ name: "Bo", email: "not-an-email", note: "" });
    expect(lead.name).toBe("Bo");
    expect(lead.email).toBeNull();
    expect(lead.rest).toEqual({ email: "not-an-email" });
  });

  it("joins array answers", () => {
    expect(submissionToLead({ services: ["Roof", "Gutter"] }).rest).toEqual({ services: "Roof, Gutter" });
  });
});

describe("isMarkdownSafe", () => {
  it("allows text-only posts and refuses media", () => {
    expect(isMarkdownSafe([{ type: "PARAGRAPH", nodes: [{ type: "TEXT" }] }, { type: "HEADING" }])).toBe(true);
    expect(isMarkdownSafe([{ type: "PARAGRAPH" }, { type: "IMAGE" }])).toBe(false);
    expect(isMarkdownSafe([{ type: "BULLETED_LIST", nodes: [{ type: "LIST_ITEM", nodes: [{ type: "GALLERY" }] }] }])).toBe(false);
    expect(isMarkdownSafe(undefined)).toBe(true);
  });
});

describe("WIX_APPS", () => {
  it("maps Wix's Blog, Stores, Bookings and Forms app ids", () => {
    expect(WIX_APPS["14bcded7-0066-7c35-14d7-466cb3f09103"]?.key).toBe("blog");
    expect(WIX_APPS["215238eb-22a5-4c36-9e7b-e7c08025e04e"]?.key).toBe("stores");
    expect(WIX_APPS["13d21c63-b5ec-5912-8397-c3a5ddb27a97"]?.key).toBe("bookings");
    expect(WIX_APPS["225dd912-7dea-4738-8688-4b8c6955ffc2"]?.key).toBe("forms");
  });
});
