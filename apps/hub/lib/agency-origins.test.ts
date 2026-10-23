import { describe, expect, it } from "vitest";

import {
  isOriginAllowed,
  normalizeOrigin,
} from "@workspace/trpc/lib/agency/origins";

describe("isOriginAllowed", () => {
  it("matches the host, ignoring www and case", () => {
    expect(isOriginAllowed(["alisamadii.com"], "www.alisamadii.com")).toBe(true);
    expect(isOriginAllowed(["alisamadii.com"], "alisamadii.com")).toBe(true);
    expect(isOriginAllowed(["www.alisamadii.com"], "alisamadii.com")).toBe(true);
    expect(isOriginAllowed(["AliSamadii.com"], "alisamadii.com")).toBe(true);
  });

  it("rejects a different host", () => {
    expect(isOriginAllowed(["alisamadii.com"], "evil.com")).toBe(false);
    expect(isOriginAllowed(["alisamadii.com"], "notalisamadii.com")).toBe(false);
  });

  it("subdomains are not the bare domain", () => {
    expect(isOriginAllowed(["alisamadii.com"], "app.alisamadii.com")).toBe(false);
  });

  it("empty list or missing host is never allowed", () => {
    expect(isOriginAllowed([], "alisamadii.com")).toBe(false);
    expect(isOriginAllowed(null, "alisamadii.com")).toBe(false);
    expect(isOriginAllowed(["alisamadii.com"], null)).toBe(false);
  });
});

describe("normalizeOrigin", () => {
  it("reduces a URL or bare domain to a bare lowercase host", () => {
    expect(normalizeOrigin("https://www.Example.com/path")).toBe("example.com");
    expect(normalizeOrigin("  Example.com ")).toBe("example.com");
    expect(normalizeOrigin("http://app.example.com")).toBe("app.example.com");
  });

  it("returns null when there's no host", () => {
    expect(normalizeOrigin("")).toBeNull();
    expect(normalizeOrigin("   ")).toBeNull();
  });
});
