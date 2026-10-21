import { describe, expect, it } from "vitest";

import {
  isExternalHosting,
  normalizeWebsiteUrl,
  parseHosting,
} from "@workspace/trpc/lib/hosting";

// Per-project hosting: content-pilot builds + serves; anything else is
// push-only (the external host deploys from GitHub).

describe("parseHosting / isExternalHosting", () => {
  it("unknown or empty values fall back to content-pilot", () => {
    expect(parseHosting(null)).toBe("content-pilot");
    expect(parseHosting("")).toBe("content-pilot");
    expect(parseHosting("heroku")).toBe("content-pilot");
    expect(isExternalHosting(undefined)).toBe(false);
  });

  it("netlify, vercel, cloudflare and other are external", () => {
    for (const host of ["netlify", "vercel", "cloudflare", "other"]) {
      expect(parseHosting(host)).toBe(host);
      expect(isExternalHosting(host)).toBe(true);
    }
    expect(isExternalHosting("content-pilot")).toBe(false);
  });
});

describe("normalizeWebsiteUrl", () => {
  it("turns a bare host or full URL into an https origin", () => {
    expect(normalizeWebsiteUrl("www.acme.com")).toBe("https://www.acme.com");
    expect(normalizeWebsiteUrl(" https://acme.com/about?x=1 ")).toBe("https://acme.com");
    expect(normalizeWebsiteUrl("http://acme.com")).toBe("http://acme.com");
  });

  it("rejects empty and dotless values", () => {
    expect(normalizeWebsiteUrl("")).toBeNull();
    expect(normalizeWebsiteUrl("   ")).toBeNull();
    expect(normalizeWebsiteUrl("localhost")).toBeNull();
    expect(normalizeWebsiteUrl("not a url")).toBeNull();
  });
});
