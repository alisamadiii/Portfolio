import { describe, expect, it } from "vitest";

import {
  CODE_ALPHABET,
  commissionFor,
  formatCents,
  generatePartnerCode,
  normalizePartnerCode,
  partnerCodeError,
  partnerStats,
  PARTNER_REF_COOKIE,
  PARTNER_REF_MAX_AGE,
  parseRefCookie,
  projectDisplayName,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
} from "@workspace/trpc/lib/partners-shared";

describe("commissionFor", () => {
  it("is 40% of the first payment, in cents", () => {
    expect(commissionFor(69_900)).toBe(27_960);
    expect(commissionFor(119_900)).toBe(47_960);
  });

  it("rounds to the nearest cent", () => {
    expect(commissionFor(1)).toBe(0);
    expect(commissionFor(3)).toBe(1);
  });
});

describe("generatePartnerCode", () => {
  it("is FIRSTNAME-XXXX", () => {
    expect(generatePartnerCode("John Smith")).toMatch(/^JOHN-[A-Z0-9]{4}$/);
  });

  it("only uses unambiguous suffix characters", () => {
    for (let i = 0; i < 200; i++) {
      const suffix = generatePartnerCode("Ali").split("-")[1]!;
      for (const ch of suffix) expect(CODE_ALPHABET).toContain(ch);
      expect(suffix).not.toMatch(/[01OIL]/);
    }
  });

  it("strips accents and non-letters, caps the name at 8", () => {
    expect(generatePartnerCode("José-María López", () => 0)).toBe("JOSEMARI-2222");
    expect(generatePartnerCode("O'Brien", () => 0)).toBe("OBRIEN-2222");
  });

  it("falls back to PARTNER when the name has no letters", () => {
    expect(generatePartnerCode("  123 ", () => 0)).toBe("PARTNER-2222");
  });
});

describe("normalizePartnerCode", () => {
  it("trims, uppercases and drops spaces", () => {
    expect(normalizePartnerCode("  john-4k7q ")).toBe("JOHN-4K7Q");
    expect(normalizePartnerCode("john - 4k7q")).toBe("JOHN-4K7Q");
  });
});

describe("partnerStats", () => {
  const paid = new Date("2026-11-01");

  it("is all zero with no referrals", () => {
    expect(partnerStats([])).toEqual({
      referrals: 0,
      paying: 0,
      paidOut: 0,
      owedCents: 0,
      paidCents: 0,
    });
  });

  it("counts a paying client without a payout as owed", () => {
    expect(
      partnerStats([
        { status: "won", clientPaidAt: paid, commissionCents: 27_960, partnerPaidAt: null },
      ])
    ).toMatchObject({ paying: 1, paidOut: 0, owedCents: 27_960, paidCents: 0 });
  });

  it("moves a paid-out commission from owed to paid", () => {
    expect(
      partnerStats([
        { status: "won", clientPaidAt: paid, commissionCents: 27_960, partnerPaidAt: paid },
        { status: "won", clientPaidAt: paid, commissionCents: 47_960, partnerPaidAt: null },
      ])
    ).toEqual({ referrals: 2, paying: 2, paidOut: 1, owedCents: 47_960, paidCents: 27_960 });
  });

  it("does not count unpaid or lost referrals as paying", () => {
    expect(
      partnerStats([
        { status: "new", clientPaidAt: null, commissionCents: null, partnerPaidAt: null },
        { status: "lost", clientPaidAt: null, commissionCents: null, partnerPaidAt: null },
      ])
    ).toEqual({ referrals: 2, paying: 0, paidOut: 0, owedCents: 0, paidCents: 0 });
  });
});

describe("formatCents", () => {
  it("drops .00 and keeps real cents", () => {
    expect(formatCents(69_900)).toBe("$699");
    expect(formatCents(27_960)).toBe("$279.60");
    expect(formatCents(0)).toBe("$0");
  });
});

describe("partnerCodeError", () => {
  it("accepts hand-picked codes in any casing", () => {
    expect(partnerCodeError("ALI")).toBeNull();
    expect(partnerCodeError("ali")).toBeNull();
    expect(partnerCodeError(" Summer-25 ")).toBeNull();
    expect(partnerCodeError("barber 2026")).toBeNull(); // spaces are dropped
  });

  it("rejects too short and too long codes", () => {
    expect(partnerCodeError("AB")).toBe("Use at least 3 characters.");
    expect(partnerCodeError("A".repeat(31))).toBe("Use 30 characters or fewer.");
  });

  it("rejects symbols, edge hyphens and double hyphens", () => {
    for (const bad of ["ALI!", "-ALI", "ALI-", "AL--I", "ALÍ", "ALI_1"]) {
      expect(partnerCodeError(bad)).toMatch(/letters, numbers and single hyphens/);
    }
  });

  it("normalizes casing so Ali and ALI are the same code", () => {
    expect(normalizePartnerCode("Ali")).toBe(normalizePartnerCode("ALI"));
  });
});

describe("projectDisplayName", () => {
  it("uses the website host, like the Sites table", () => {
    expect(projectDisplayName({ websiteUrl: "https://www.hazaraoregon.org/about", repo: "website" })).toBe(
      "www.hazaraoregon.org"
    );
  });

  it("falls back to the repo without a website", () => {
    expect(projectDisplayName({ websiteUrl: null, repo: "jax-auto-lab-astro-v2" })).toBe("jax-auto-lab-astro-v2");
    expect(projectDisplayName({ websiteUrl: "   ", repo: "dist" })).toBe("dist");
  });

  it("falls back to the repo when the URL has no host", () => {
    expect(projectDisplayName({ websiteUrl: "https:///", repo: "website" })).toBe("website");
  });
});

describe("payout receipts", () => {
  it("accepts screenshots and PDFs only", () => {
    expect(RECEIPT_TYPES).toEqual(["image/png", "image/jpeg", "image/webp", "image/heic", "application/pdf"]);
    expect((RECEIPT_TYPES as readonly string[]).includes("image/gif")).toBe(false);
  });

  it("caps a receipt at 10 MB", () => {
    expect(RECEIPT_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("parseRefCookie", () => {
  it("is null without the cookie", () => {
    expect(parseRefCookie(null)).toBeNull();
    expect(parseRefCookie("")).toBeNull();
    expect(parseRefCookie("better-auth.session_token=abc; theme=dark")).toBeNull();
  });

  it("reads and normalizes the code among other cookies", () => {
    expect(parseRefCookie("partner_ref=ali")).toBe("ALI");
    expect(parseRefCookie("theme=dark; partner_ref=summer-25; x=1")).toBe("SUMMER-25");
    expect(parseRefCookie("partner_ref=ali%20")).toBe("ALI");
  });

  it("ignores cookies that only end with the name", () => {
    expect(parseRefCookie("old_partner_ref=ALI")).toBeNull();
  });

  it("rejects invalid or oversized codes", () => {
    expect(parseRefCookie("partner_ref=")).toBeNull();
    expect(parseRefCookie("partner_ref=a!b")).toBeNull();
    expect(parseRefCookie(`partner_ref=${"A".repeat(31)}`)).toBeNull();
    expect(parseRefCookie("partner_ref=%E0%A4%A")).toBeNull(); // bad escape
  });

  it("uses the partner_ref name and lasts 30 days", () => {
    expect(PARTNER_REF_COOKIE).toBe("partner_ref");
    expect(PARTNER_REF_MAX_AGE).toBe(2_592_000);
  });
});
