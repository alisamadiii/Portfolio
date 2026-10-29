import { describe, expect, it } from "vitest";

import { normalizeWebsiteUrl } from "@workspace/trpc/lib/website-url";

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
