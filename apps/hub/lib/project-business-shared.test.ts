import { describe, expect, it } from "vitest";

import { sniffLogoType } from "@workspace/trpc/lib/logo-shared";
import { parseGoogleReviewUrl } from "@workspace/trpc/lib/project-business-shared";

// 2026-11-28: moved from review-link.test.ts when the Feedback app was removed.
// parseGoogleReviewUrl now lives next to the other Google listing helpers.
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
