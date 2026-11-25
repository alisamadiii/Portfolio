import { describe, expect, it } from "vitest";

import {
  isOutgoingToRecipient,
  matchPayoutReferral,
  MERCURY_SIGNATURE_MAX_AGE_MS,
  signMercuryPayload,
  verifyMercurySignature,
} from "@workspace/trpc/lib/mercury-shared";
import {
  isMercuryFailed,
  mercuryAmountToCents,
  partnerPayoutState,
  PAYOUT_STATE_LABELS,
} from "@workspace/trpc/lib/partners-shared";

const SECRET = "whsec_test";
const BODY = JSON.stringify({ id: "evt_1", resourceType: "transaction", resourceId: "tx_1" });
const NOW = 1_764_000_000_000;

describe("verifyMercurySignature", () => {
  it("accepts a header Mercury would send for this body", () => {
    const header = signMercuryPayload(BODY, SECRET, NOW);
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(verifyMercurySignature(BODY, header, SECRET, NOW)).toBe(true);
  });

  it("accepts the parts in either order and an uppercase digest", () => {
    const [t, v1] = signMercuryPayload(BODY, SECRET, NOW).split(",");
    const upper = `v1=${v1!.slice(3).toUpperCase()}`;
    expect(verifyMercurySignature(BODY, `${upper}, ${t}`, SECRET, NOW)).toBe(true);
  });

  it("rejects a wrong secret, a changed body and a tampered digest", () => {
    const header = signMercuryPayload(BODY, SECRET, NOW);
    expect(verifyMercurySignature(BODY, header, "other", NOW)).toBe(false);
    expect(verifyMercurySignature(BODY + " ", header, SECRET, NOW)).toBe(false);
    expect(verifyMercurySignature(BODY, header.replace(/.$/, (c) => (c === "0" ? "1" : "0")), SECRET, NOW)).toBe(false);
  });

  it("rejects replays older than 5 minutes, either direction", () => {
    const header = signMercuryPayload(BODY, SECRET, NOW);
    expect(verifyMercurySignature(BODY, header, SECRET, NOW + MERCURY_SIGNATURE_MAX_AGE_MS - 1000)).toBe(true);
    expect(verifyMercurySignature(BODY, header, SECRET, NOW + MERCURY_SIGNATURE_MAX_AGE_MS + 1000)).toBe(false);
    expect(verifyMercurySignature(BODY, header, SECRET, NOW - MERCURY_SIGNATURE_MAX_AGE_MS - 1000)).toBe(false);
  });

  it("rejects missing or malformed headers without throwing", () => {
    expect(verifyMercurySignature(BODY, null, SECRET, NOW)).toBe(false);
    expect(verifyMercurySignature(BODY, "", SECRET, NOW)).toBe(false);
    expect(verifyMercurySignature(BODY, "t=abc,v1=00", SECRET, NOW)).toBe(false);
    expect(verifyMercurySignature(BODY, "v1=zz", SECRET, NOW)).toBe(false);
    expect(verifyMercurySignature(BODY, "t=1764000000", SECRET, NOW)).toBe(false);
    expect(verifyMercurySignature(BODY, "t=1764000000,v1=0x", SECRET, NOW)).toBe(false);
    expect(verifyMercurySignature(BODY, signMercuryPayload(BODY, SECRET, NOW), "", NOW)).toBe(false);
  });
});

describe("isOutgoingToRecipient", () => {
  it("needs a recipient and either an outgoing kind or a debit amount", () => {
    expect(isOutgoingToRecipient({ kind: "outgoingPayment", counterpartyId: "rcp_1", amount: 194.14 })).toBe(true);
    expect(isOutgoingToRecipient({ kind: "externalTransfer", counterpartyId: "rcp_1", amount: -194.14 })).toBe(true);
    expect(isOutgoingToRecipient({ kind: "incomingDomesticWire", counterpartyId: "rcp_1", amount: 500 })).toBe(false);
    expect(isOutgoingToRecipient({ kind: "outgoingPayment", counterpartyId: null, amount: -50 })).toBe(false);
  });
});

describe("matchPayoutReferral", () => {
  const owed = (id: number, commissionCents: number | null, extra: Partial<Parameters<typeof matchPayoutReferral>[1][number]> = {}) => ({
    id,
    commissionCents,
    partnerPaidAt: null,
    mercuryTransactionId: null,
    ...extra,
  });

  it("matches the one owed referral with that commission, sign and cents ignored", () => {
    const rows = [owed(1, 13_569), owed(2, 19_414)];
    expect(matchPayoutReferral({ id: "tx_1", amount: -194.14 }, rows)?.id).toBe(2);
    expect(matchPayoutReferral({ id: "tx_1", amount: 135.69 }, rows)?.id).toBe(1);
  });

  it("returns null when zero or several owed referrals fit (admin records it by hand)", () => {
    expect(matchPayoutReferral({ id: "tx_1", amount: 10 }, [owed(1, 13_569)])).toBeNull();
    expect(matchPayoutReferral({ id: "tx_1", amount: 135.69 }, [owed(1, 13_569), owed(2, 13_569)])).toBeNull();
    expect(matchPayoutReferral({ id: "tx_1", amount: 135.69 }, [owed(1, null)])).toBeNull();
  });

  it("skips referrals already paid or already tied to another transfer", () => {
    const rows = [owed(1, 13_569, { partnerPaidAt: new Date() }), owed(2, 13_569, { mercuryTransactionId: "tx_other" }), owed(3, 13_569)];
    expect(matchPayoutReferral({ id: "tx_1", amount: 135.69 }, rows)?.id).toBe(3);
  });

  it("a repeated event for the same transfer lands on the same referral even if paid or the amount changed", () => {
    const rows = [owed(1, 13_569, { partnerPaidAt: new Date(), mercuryTransactionId: "tx_1" }), owed(2, 13_569)];
    expect(matchPayoutReferral({ id: "tx_1", amount: 135.69 }, rows)?.id).toBe(1);
    expect(matchPayoutReferral({ id: "tx_1", amount: 1 }, rows)?.id).toBe(1);
  });
});

describe("partnerPayoutState", () => {
  const base = { mercuryInviteId: null, mercuryInviteStatus: null, mercuryRecipientId: null };
  it("derives the state from the invite columns", () => {
    expect(partnerPayoutState(base)).toBe("not_invited");
    expect(partnerPayoutState({ ...base, mercuryInviteId: "inv", mercuryInviteStatus: "created" })).toBe("invited");
    expect(partnerPayoutState({ ...base, mercuryInviteId: "inv", mercuryInviteStatus: "expired" })).toBe("expired");
    expect(partnerPayoutState({ ...base, mercuryInviteId: "inv", mercuryInviteStatus: "declined" })).toBe("expired");
    expect(partnerPayoutState({ ...base, mercuryInviteId: "inv", mercuryInviteStatus: "completed", mercuryRecipientId: "rcp" })).toBe("ready");
  });
  it("a recipient id wins even when the invite later expires", () => {
    expect(partnerPayoutState({ ...base, mercuryInviteId: "inv", mercuryInviteStatus: "expired", mercuryRecipientId: "rcp" })).toBe("ready");
  });
  it("has a label for every state", () => {
    for (const s of ["not_invited", "invited", "ready", "expired"] as const) expect(PAYOUT_STATE_LABELS[s]).toBeTruthy();
  });
});

describe("mercury transaction helpers", () => {
  it("flags the statuses where money did not arrive", () => {
    expect(isMercuryFailed("failed")).toBe(true);
    expect(isMercuryFailed("reversed")).toBe(true);
    expect(isMercuryFailed("cancelled")).toBe(true);
    expect(isMercuryFailed("blocked")).toBe(true);
    expect(isMercuryFailed("sent")).toBe(false);
    expect(isMercuryFailed("pending")).toBe(false);
    expect(isMercuryFailed(null)).toBe(false);
  });
  it("converts Mercury dollar amounts to cents, ignoring sign", () => {
    expect(mercuryAmountToCents(-194.14)).toBe(19_414);
    expect(mercuryAmountToCents(135.69)).toBe(13_569);
    expect(mercuryAmountToCents(0.1 + 0.2)).toBe(30);
  });
});
