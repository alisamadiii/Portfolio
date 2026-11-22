import { createHmac } from "crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isFreshSnsTimestamp, isSnsCertUrl } from "@workspace/trpc/lib/inbound/sns";
import { OUTBOUND_LIMITS, senderDisplayName } from "@workspace/trpc/lib/inbox-shared";
import {
  commissionFor,
  PARTNER_AGREEMENT_VERSION,
  PROVIDER_FEES,
  providerFeeCents,
} from "@workspace/trpc/lib/partners-shared";
import { normalizeWebsiteUrl } from "@workspace/trpc/lib/website-url";
import { verifySignedInstance } from "@workspace/trpc/lib/wix-shared";

// Security pass 2026-11-15: each finding that has a pure helper gets a test.

describe("normalizeWebsiteUrl: only public websites (server fetches it)", () => {
  it("rejects IP literals", () => {
    expect(normalizeWebsiteUrl("http://169.254.169.254")).toBeNull();
    expect(normalizeWebsiteUrl("10.0.0.5")).toBeNull();
    expect(normalizeWebsiteUrl("http://[::1]")).toBeNull();
  });

  it("rejects local and internal names", () => {
    expect(normalizeWebsiteUrl("http://app.localhost")).toBeNull();
    expect(normalizeWebsiteUrl("printer.local")).toBeNull();
    expect(normalizeWebsiteUrl("db.internal")).toBeNull();
  });

  it("rejects custom ports and credentials", () => {
    expect(normalizeWebsiteUrl("https://acme.com:8080")).toBeNull();
    expect(normalizeWebsiteUrl("https://user:pass@acme.com")).toBeNull();
  });

  it("still accepts normal sites, default port included", () => {
    expect(normalizeWebsiteUrl("https://acme.com:443/x")).toBe("https://acme.com");
    expect(normalizeWebsiteUrl("shop.acme.co.uk")).toBe("https://shop.acme.co.uk");
  });
});

describe("verifySignedInstance with maxAgeMs (Wix install callback)", () => {
  const SECRET = "app-secret";
  const sign = (data: object) => {
    const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
    const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
    return `${sig}.${payload}`;
  };
  const now = Date.parse("2026-11-15T12:00:00Z");
  const opts = { maxAgeMs: 10 * 60_000, now };

  it("accepts a freshly signed instance", () => {
    const signed = sign({ instanceId: "i", signDate: "2026-11-15T11:58:00Z" });
    expect(verifySignedInstance(signed, SECRET, opts)).toMatchObject({ instanceId: "i" });
  });

  it("rejects a stale one (replayed install URL)", () => {
    const signed = sign({ instanceId: "i", signDate: "2026-11-15T10:00:00Z" });
    expect(verifySignedInstance(signed, SECRET, opts)).toBeNull();
  });

  it("rejects a missing or future signDate", () => {
    expect(verifySignedInstance(sign({ instanceId: "i" }), SECRET, opts)).toBeNull();
    const future = sign({ instanceId: "i", signDate: "2026-11-15T13:00:00Z" });
    expect(verifySignedInstance(future, SECRET, opts)).toBeNull();
  });
});

describe("SNS hardening", () => {
  it("only trusts SNS's own signing certificates", () => {
    expect(isSnsCertUrl("https://sns.us-west-2.amazonaws.com/attacker.pem")).toBe(false);
    expect(
      isSnsCertUrl("https://sns.us-west-2.amazonaws.com/SimpleNotificationService-abc.pem")
    ).toBe(true);
  });

  it("rejects old or far-future timestamps", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    expect(isFreshSnsTimestamp("2026-11-15T11:59:00.000Z", now)).toBe(true);
    expect(isFreshSnsTimestamp("2026-11-14T12:00:00.000Z", now)).toBe(false);
    expect(isFreshSnsTimestamp("2026-11-15T13:00:00.000Z", now)).toBe(false);
    expect(isFreshSnsTimestamp("nonsense", now)).toBe(false);
  });
});

describe("senderDisplayName (email From display names)", () => {
  it("strips anything that could forge an address or break headers", () => {
    expect(senderDisplayName('Stripe Billing <billing@alisamadii.com>,')).toBe(
      "Stripe Billing billingalisamadii.com"
    );
    expect(senderDisplayName('Acme "Co"\r\nBcc: x@y.com')).toBe("Acme Co Bcc xy.com");
  });

  it("keeps normal business names and caps the length", () => {
    expect(senderDisplayName("Joe's Plumbing & Heating")).toBe("Joe's Plumbing & Heating");
    expect(senderDisplayName("Café Ñandú")).toBe("Café Ñandú");
    expect(senderDisplayName("x".repeat(100))).toHaveLength(60);
    expect(senderDisplayName("<>")).toBe("Message");
  });
});

describe("inbox outbound limits", () => {
  it("allow normal use but cap a day of sends", () => {
    expect(OUTBOUND_LIMITS.perHour).toBeGreaterThanOrEqual(30);
    expect(OUTBOUND_LIMITS.perDay).toBeLessThanOrEqual(500);
  });
});

describe("partner agreement version", () => {
  it("matches the version the partner site signs", () => {
    const config = readFileSync(
      resolve(__dirname, "../../partner-program/src/config.ts"),
      "utf8"
    );
    expect(config).toContain(`agreementVersion: '${PARTNER_AGREEMENT_VERSION}'`);
  });
});

describe("partner commission after provider fees (agreement 2026-11.3, default 20%)", () => {
  const stripeFee = (cents: number) =>
    providerFeeCents(cents, PROVIDER_FEES.stripe.percent, PROVIDER_FEES.stripe.fixedCents);

  it("matches the agreement's Stripe examples", () => {
    expect(stripeFee(69_900)).toBe(2_057);
    expect(commissionFor(69_900, stripeFee(69_900))).toBe(13_569);
    expect(stripeFee(100_000)).toBe(2_930);
    expect(commissionFor(100_000, stripeFee(100_000))).toBe(19_414);
    expect(stripeFee(119_900)).toBe(3_507);
    expect(commissionFor(119_900, stripeFee(119_900))).toBe(23_279);
  });

  it("pays 20% of the full amount when there are no fees", () => {
    expect(PROVIDER_FEES.zelle).toEqual({ percent: 0, fixedCents: 0 });
    expect(commissionFor(69_900)).toBe(13_980);
  });

  it("never goes negative when the fee exceeds the amount", () => {
    expect(commissionFor(20, 50)).toBe(0);
  });
});
