import { describe, expect, it } from "vitest";

import { sniffLogoType } from "@workspace/trpc/lib/logo-shared";
import {
  SLUG_LENGTH,
  businessSearchQuery,
  googleReviewUrl,
  isReviewSlug,
  newReviewSlug,
  parseGoogleReviewUrl,
  reviewInfoStatus,
} from "@workspace/trpc/lib/review-link-shared";

describe("googleReviewUrl", () => {
  it("builds the writereview link for a place", () => {
    expect(googleReviewUrl("ChIJT5scynmXKyIRlwFotSc8Yqc")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJT5scynmXKyIRlwFotSc8Yqc"
    );
  });

  it("encodes characters that would break the query string", () => {
    expect(googleReviewUrl("a&b")).toContain("placeid=a%26b");
  });
});

describe("newReviewSlug", () => {
  it("makes an 8-char slug that passes isReviewSlug", () => {
    const slug = newReviewSlug();
    expect(slug).toHaveLength(SLUG_LENGTH);
    expect(isReviewSlug(slug)).toBe(true);
  });

  it("never uses look-alike characters", () => {
    for (let i = 0; i < 200; i++) expect(newReviewSlug()).not.toMatch(/[0O1lI]/);
  });

  it("rejects ids that are not slugs (path tricks, wrong length)", () => {
    expect(isReviewSlug("../etc")).toBe(false);
    expect(isReviewSlug("abc")).toBe(false);
    expect(isReviewSlug("abcdefgh1")).toBe(false);
  });
});

// 2026-11-18: reviewInfoStatus reads the project's business details
// (hub_project) instead of agency_client.business_info; reviewBusiness is
// gone since the review page reads the project row directly.
describe("reviewInfoStatus", () => {
  const none = { name: null, address: null, phone: null, logoKey: null };

  it("needs business name and address", () => {
    expect(reviewInfoStatus(none)).toMatchObject({
      ready: false,
      missing: ["name", "address"],
    });
  });

  it("whitespace-only values count as missing", () => {
    expect(
      reviewInfoStatus({ ...none, name: "  ", address: "1 Main St", logoKey: "logos/x.webp" }).missing
    ).toEqual(["name"]);
  });

  it("is ready without logo or phone, but recommends them", () => {
    expect(reviewInfoStatus({ ...none, name: "Acme", address: "1 Main St" })).toEqual({
      ready: true,
      missing: [],
      recommended: ["logo", "phone"],
    });
  });

  it("recommends nothing once logo and phone are set", () => {
    expect(
      reviewInfoStatus({ name: "Acme", address: "1 Main St", phone: "555", logoKey: "logos/x.webp" })
    ).toEqual({ ready: true, missing: [], recommended: [] });
  });
});

describe("sniffLogoType", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

  it("detects PNG, JPEG and WebP by magic bytes", () => {
    expect(sniffLogoType(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
    expect(sniffLogoType(bytes(0xff, 0xd8, 0xff))).toBe("image/jpeg");
    expect(
      sniffLogoType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))
    ).toBe("image/webp");
  });

  it("rejects SVG and anything else", () => {
    expect(sniffLogoType(new TextEncoder().encode("<svg xmlns='x'></svg>"))).toBeNull();
    expect(sniffLogoType(new Uint8Array())).toBeNull();
  });
});

describe("parseGoogleReviewUrl", () => {
  it("accepts the Business Profile short link", () => {
    expect(parseGoogleReviewUrl(" https://g.page/r/CQ8pNmDSUzx8EAE/review ")).toBe(
      "https://g.page/r/CQ8pNmDSUzx8EAE/review"
    );
    expect(parseGoogleReviewUrl("https://g.page/r/CQ8pNmDSUzx8EAE/review/?x=1")).toBe(
      "https://g.page/r/CQ8pNmDSUzx8EAE/review"
    );
  });

  // Deliberately flipped (2026-11-15): the Business Profile link is required,
  // the placeid link no longer counts as one.
  it("rejects the writereview placeid link", () => {
    expect(
      parseGoogleReviewUrl("https://search.google.com/local/writereview?placeid=ChIJT5scynmXKyIRlwFotSc8Yqc")
    ).toBeNull();
  });

  it("rejects other links and junk", () => {
    expect(parseGoogleReviewUrl("https://g.page/r/abc")).toBeNull();
    expect(parseGoogleReviewUrl("https://evil.com/r/abc/review")).toBeNull();
    expect(parseGoogleReviewUrl("https://search.google.com/local/writereview")).toBeNull();
    expect(parseGoogleReviewUrl("javascript:alert(1)")).toBeNull();
    expect(parseGoogleReviewUrl("not a url")).toBeNull();
  });
});

describe("businessSearchQuery", () => {
  it("uses the name plus the city part, never the street", () => {
    expect(businessSearchQuery("Acme Plumbing", "566 Kit St, Jacksonville, FL 32216, USA")).toBe(
      "Acme Plumbing, Jacksonville, FL 32216"
    );
  });

  it("falls back to the name alone when the address has no city part", () => {
    expect(businessSearchQuery("Acme Plumbing", "566 Kit St")).toBe("Acme Plumbing");
    expect(businessSearchQuery("Acme Plumbing", "")).toBe("Acme Plumbing");
  });
});
