import { describe, expect, it } from "vitest";

import { framePolicyFromHeaders } from "@workspace/trpc/lib/frame-policy";

// Gallery thumbnails iframe each project's site; sites whose security headers
// refuse framing get a placeholder card instead of a blank frame.

const HUB = "https://hub.alisamadii.com";
const headers = (values: Record<string, string>) =>
  new Headers(values) as unknown as { get(name: string): string | null };

describe("framePolicyFromHeaders", () => {
  it("allows a site with no framing headers", () => {
    expect(framePolicyFromHeaders(headers({}), HUB)).toBe("frameable");
  });

  it("blocks X-Frame-Options SAMEORIGIN and DENY", () => {
    expect(framePolicyFromHeaders(headers({ "x-frame-options": "SAMEORIGIN" }), HUB)).toBe("blocked");
    expect(framePolicyFromHeaders(headers({ "x-frame-options": "deny" }), HUB)).toBe("blocked");
  });

  it("blocks frame-ancestors 'self' and 'none'", () => {
    expect(
      framePolicyFromHeaders(headers({ "content-security-policy": "frame-ancestors 'self'" }), HUB)
    ).toBe("blocked");
    expect(
      framePolicyFromHeaders(headers({ "content-security-policy": "frame-ancestors 'none'" }), HUB)
    ).toBe("blocked");
  });

  it("allows frame-ancestors that lists the hub origin, even with X-Frame-Options", () => {
    expect(
      framePolicyFromHeaders(
        headers({
          "content-security-policy": "default-src 'self'; frame-ancestors 'self' https://hub.alisamadii.com",
          "x-frame-options": "SAMEORIGIN",
        }),
        HUB
      )
    ).toBe("frameable");
  });

  it("matches wildcard hosts, schemes and *", () => {
    const csp = (v: string) => headers({ "content-security-policy": `frame-ancestors ${v}` });
    expect(framePolicyFromHeaders(csp("https://*.alisamadii.com"), HUB)).toBe("frameable");
    expect(framePolicyFromHeaders(csp("https:"), HUB)).toBe("frameable");
    expect(framePolicyFromHeaders(csp("*"), HUB)).toBe("frameable");
    expect(framePolicyFromHeaders(csp("https://other.com"), HUB)).toBe("blocked");
  });

  it("treats a localhost hub as a different origin", () => {
    expect(
      framePolicyFromHeaders(
        headers({ "content-security-policy": "frame-ancestors 'self' https://hub.alisamadii.com" }),
        "http://localhost:3001"
      )
    ).toBe("blocked");
  });
});
