import { createSign, generateKeyPairSync, generateKeyPairSync as rsaKeys, sign } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  formatPhone,
  leadChannels,
  parseReplyAddress,
  replyAddress,
  stripQuotedReply,
  smsSegments,
  telnyxStatus,
  threadItems,
  toE164,
  type InboxMessage,
} from "@workspace/trpc/lib/inbox-shared";
import { isSnsCertUrl, snsStringToSign, verifySnsSignature, type SnsMessage } from "@workspace/trpc/lib/inbound/sns";
import { verifyTelnyxSignature } from "@workspace/trpc/lib/telnyx/signature";

describe("toE164", () => {
  it("formats a typed US number", () => {
    expect(toE164("(904) 555-0100")).toBe("+19045550100");
  });
  it("keeps a number that already has +1", () => {
    expect(toE164("+1 904 555 0100")).toBe("+19045550100");
  });
  it("drops a leading 1 on 11 digits", () => {
    expect(toE164("1-904-555-0100")).toBe("+19045550100");
  });
  it("rejects short, garbage and impossible numbers", () => {
    expect(toE164("555-0100")).toBeNull();
    expect(toE164("call me")).toBeNull();
    expect(toE164("")).toBeNull();
    expect(toE164(null)).toBeNull();
    // area code can't start with 0 or 1
    expect(toE164("104-555-0100")).toBeNull();
  });
  it("keeps other countries already in + form", () => {
    expect(toE164("+44 20 7946 0958")).toBe("+442079460958");
  });
});

describe("formatPhone", () => {
  it("pretty-prints US numbers and passes others through", () => {
    expect(formatPhone("+19045550100")).toBe("(904) 555-0100");
    expect(formatPhone("+442079460958")).toBe("+442079460958");
    expect(formatPhone(null)).toBe("");
  });
});

describe("leadChannels", () => {
  it("phone only, email only, both, neither", () => {
    expect(leadChannels({ phone: "904-555-0100" })).toEqual(["sms"]);
    expect(leadChannels({ email: "a@b.co" })).toEqual(["email"]);
    expect(leadChannels({ phone: "904-555-0100", email: "a@b.co" })).toEqual(["sms", "email"]);
    expect(leadChannels({ phone: "nope", email: "  " })).toEqual([]);
  });
});

describe("smsSegments", () => {
  it("GSM-7: 160 in one part, 153 per part after", () => {
    expect(smsSegments("a".repeat(160)).segments).toBe(1);
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
    expect(smsSegments("a".repeat(306)).segments).toBe(2);
    expect(smsSegments("a".repeat(307)).segments).toBe(3);
  });
  it("extension characters count twice", () => {
    expect(smsSegments("€".repeat(80)).units).toBe(160);
    expect(smsSegments("€".repeat(81)).segments).toBe(2);
  });
  it("an emoji switches to UCS-2: 70 / 67", () => {
    const r = smsSegments(`${"a".repeat(68)}😀`);
    expect(r.encoding).toBe("UCS-2");
    expect(r.units).toBe(70);
    expect(r.segments).toBe(1);
    expect(smsSegments(`${"a".repeat(69)}😀`).segments).toBe(2);
  });
  it("empty text is zero parts", () => {
    expect(smsSegments("").segments).toBe(0);
  });
});

describe("telnyxStatus", () => {
  it("maps carrier statuses", () => {
    expect(telnyxStatus("queued")).toBe("queued");
    expect(telnyxStatus("delivered")).toBe("delivered");
    expect(telnyxStatus("delivery_failed")).toBe("failed");
    expect(telnyxStatus("sending_failed")).toBe("failed");
    expect(telnyxStatus("delivery_unconfirmed")).toBe("sent");
    expect(telnyxStatus(undefined)).toBe("sent");
  });
});

const msg = (id: number, at: string, direction: "in" | "out" = "out"): InboxMessage => ({
  id,
  channel: "sms",
  direction,
  body: `m${id}`,
  subject: null,
  mediaUrls: null,
  status: "sent",
  error: null,
  createdAt: at,
});

describe("threadItems", () => {
  const lead = { createdAt: "2026-11-12T10:00:00", formName: "Contact", message: "Hi", source: "form" };

  it("opens with the form submission, then messages oldest first", () => {
    const items = threadItems(lead, [msg(2, "2026-11-12T12:00:00"), msg(1, "2026-11-12T11:00:00")]);
    expect(items.map((i) => i.kind)).toEqual(["day", "submission", "message", "message"]);
    expect(items.filter((i) => i.kind === "message").map((i) => i.key)).toEqual(["m1", "m2"]);
  });

  it("adds a day separator when the day changes", () => {
    const items = threadItems(lead, [msg(1, "2026-11-13T09:00:00"), msg(2, "2026-11-13T10:00:00")]);
    expect(items.map((i) => i.kind)).toEqual(["day", "submission", "day", "message", "message"]);
  });

  it("a lead who texted in has no form card", () => {
    const items = threadItems({ ...lead, source: "sms" }, [msg(1, "2026-11-12T10:00:00", "in")]);
    expect(items.map((i) => i.kind)).toEqual(["day", "message"]);
  });

  it("the submission stays first even when a message shares its timestamp", () => {
    const items = threadItems(lead, [msg(1, "2026-11-12T10:00:00")]);
    expect(items[1]!.kind).toBe("submission");
  });
});

describe("verifyTelnyxSignature", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  // Raw 32-byte key, base64, the way the Telnyx portal shows it.
  const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64");
  const body = JSON.stringify({ data: { event_type: "message.received" } });
  const now = 1_800_000_000;
  const signed = (ts: number, payload = body) =>
    sign(null, Buffer.from(`${ts}|${payload}`), privateKey).toString("base64");

  it("accepts a valid signature", () => {
    expect(
      verifyTelnyxSignature({ rawBody: body, signature: signed(now), timestamp: String(now), publicKey: rawPublic, nowSeconds: now })
    ).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(
      verifyTelnyxSignature({
        rawBody: body.replace("received", "sent"),
        signature: signed(now),
        timestamp: String(now),
        publicKey: rawPublic,
        nowSeconds: now,
      })
    ).toBe(false);
  });
  it("rejects a stale timestamp", () => {
    const old = now - 301;
    expect(
      verifyTelnyxSignature({ rawBody: body, signature: signed(old), timestamp: String(old), publicKey: rawPublic, nowSeconds: now })
    ).toBe(false);
  });
  it("rejects missing headers and a bad key", () => {
    expect(verifyTelnyxSignature({ rawBody: body, signature: null, timestamp: String(now), publicKey: rawPublic, nowSeconds: now })).toBe(false);
    expect(
      verifyTelnyxSignature({ rawBody: body, signature: signed(now), timestamp: String(now), publicKey: "short", nowSeconds: now })
    ).toBe(false);
  });
});

// ─── Email replies (SES inbound) ─────────────────────────────────

describe("reply addresses", () => {
  it("round-trips lead id and signature", () => {
    const addr = replyAddress(42, "abc123def456", "reply.example.com");
    expect(addr).toBe("r+42.abc123def456@reply.example.com");
    expect(parseReplyAddress(addr)).toEqual({ leadId: 42, sig: "abc123def456" });
  });
  it("accepts upper case (mail servers may change it)", () => {
    expect(parseReplyAddress("R+42.ABC123DEF456@REPLY.EXAMPLE.COM")).toEqual({ leadId: 42, sig: "abc123def456" });
  });
  it("rejects other addresses, short signatures and lead 0", () => {
    expect(parseReplyAddress("a@alisamadii.com")).toBeNull();
    expect(parseReplyAddress("r+42.abc@reply.example.com")).toBeNull();
    expect(parseReplyAddress("r+0.abc123def456@reply.example.com")).toBeNull();
    expect(parseReplyAddress("r+42.zzzzzzzzzzzz@reply.example.com")).toBeNull();
  });
});

describe("stripQuotedReply", () => {
  it("cuts Gmail's 'On … wrote:' history", () => {
    const text = "I am doing great? thanks\n\nOn Fri, Nov 14, 2026 at 7:59 PM mohammadsamadi.com <noreply@alisamadii.com> wrote:\n> Hi how are you doing?\n";
    expect(stripQuotedReply(text)).toBe("I am doing great? thanks");
  });
  it("cuts Gmail's header when it wraps onto two lines", () => {
    const text = "Sounds good\n\nOn Fri, Nov 14, 2026 at 7:59 PM Coastal Pest Pros <\nnoreply@alisamadii.com> wrote:\n\n> Hi";
    expect(stripQuotedReply(text)).toBe("Sounds good");
  });
  it("cuts an Outlook header block", () => {
    const text = "Yes please.\n\nFrom: Coastal Pest Pros <noreply@alisamadii.com>\nSent: Friday, November 14, 2026 8:00 PM\nTo: Sarah\nSubject: Quote";
    expect(stripQuotedReply(text)).toBe("Yes please.");
  });
  it("keeps a line that merely starts with 'From:'", () => {
    expect(stripQuotedReply("From: the back door is best.\nThanks")).toBe("From: the back door is best.\nThanks");
  });
  it("cuts a trailing '>' quote block and a '-- ' signature", () => {
    expect(stripQuotedReply("Ok!\n\n> old\n> older")).toBe("Ok!");
    expect(stripQuotedReply("Thanks\n-- \nSarah J.\n555-0100")).toBe("Thanks");
  });
  it("keeps inline '>' quotes followed by new text", () => {
    expect(stripQuotedReply("> Thursday?\nYes Thursday works")).toBe("> Thursday?\nYes Thursday works");
  });
  it("keeps a reply with no quote whole, and drops mobile footers", () => {
    expect(stripQuotedReply("Line one\nLine two")).toBe("Line one\nLine two");
    expect(stripQuotedReply("On my way\n\nSent from my iPhone")).toBe("On my way");
  });
});

describe("SNS verification", () => {
  const { publicKey, privateKey } = rsaKeys("rsa", { modulusLength: 2048 });
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const base: Omit<SnsMessage, "Signature"> = {
    Type: "Notification",
    MessageId: "m-1",
    TopicArn: "arn:aws:sns:us-west-2:123:lead-replies",
    Message: '{"notificationType":"Received"}',
    Timestamp: "2026-11-15T01:00:00.000Z",
    SignatureVersion: "2",
    SigningCertURL: "https://sns.us-west-2.amazonaws.com/SimpleNotificationService-abc.pem",
  };
  const signed = (msg: Omit<SnsMessage, "Signature">): SnsMessage => ({
    ...msg,
    Signature: createSign("RSA-SHA256").update(snsStringToSign(msg as SnsMessage)).sign(privateKey, "base64"),
  });

  it("builds the Notification string to sign (Subject only when present)", () => {
    expect(snsStringToSign({ ...base, Signature: "" })).toBe(
      `Message\n${base.Message}\nMessageId\nm-1\nTimestamp\n${base.Timestamp}\nTopicArn\n${base.TopicArn}\nType\nNotification\n`
    );
    expect(snsStringToSign({ ...base, Subject: "Hi", Signature: "" })).toContain("Subject\nHi\n");
  });
  it("builds the SubscriptionConfirmation string to sign", () => {
    const s = snsStringToSign({ ...base, Type: "SubscriptionConfirmation", SubscribeURL: "https://x", Token: "t", Signature: "" });
    expect(s).toBe(
      `Message\n${base.Message}\nMessageId\nm-1\nSubscribeURL\nhttps://x\nTimestamp\n${base.Timestamp}\nToken\nt\nTopicArn\n${base.TopicArn}\nType\nSubscriptionConfirmation\n`
    );
  });
  it("accepts a valid signature and rejects a tampered message", () => {
    const msg = signed(base);
    expect(verifySnsSignature(msg, pem)).toBe(true);
    expect(verifySnsSignature({ ...msg, Message: '{"notificationType":"Bounce"}' }, pem)).toBe(false);
    expect(verifySnsSignature({ ...msg, SignatureVersion: "3" }, pem)).toBe(false);
  });
  it("only trusts certificates hosted by SNS over https", () => {
    expect(isSnsCertUrl(base.SigningCertURL)).toBe(true);
    expect(isSnsCertUrl("http://sns.us-west-2.amazonaws.com/x.pem")).toBe(false);
    expect(isSnsCertUrl("https://sns.us-west-2.amazonaws.com.evil.com/x.pem")).toBe(false);
    expect(isSnsCertUrl("https://evil.com/sns.us-west-2.amazonaws.com/x.pem")).toBe(false);
  });
});
