import { describe, expect, it } from "vitest";

import {
  freeSubdomainBase,
  normalizeHost,
  validateCustomHost,
  validateSlug,
} from "@workspace/trpc/lib/domains";

// Hub-side mirrors of content-pilot's domain rules (pilot re-validates
// authoritatively; these exist for fast, friendly errors).

describe("normalizeHost", () => {
  it("lowercases, strips port and trailing dot", () => {
    expect(normalizeHost("WWW.Client.COM")).toBe("www.client.com");
    expect(normalizeHost("www.client.com:8080")).toBe("www.client.com");
    expect(normalizeHost("www.client.com.")).toBe("www.client.com");
  });

  it("punycodes unicode", () => {
    expect(normalizeHost("www.münchen.de")).toBe("www.xn--mnchen-3ya.de");
  });

  it("returns empty on garbage", () => {
    expect(normalizeHost("")).toBe("");
    expect(normalizeHost("   ")).toBe("");
  });
});

describe("validateSlug", () => {
  it("accepts and lowercases clean slugs", () => {
    expect(validateSlug("My-Shop")).toBe("my-shop");
  });

  it("rejects bounds, charset, reserved and collision shapes", () => {
    expect(() => validateSlug("ab")).toThrow(/3 to 63/);
    expect(() => validateSlug("my_site")).toThrow(/lowercase/);
    expect(() => validateSlug("www")).toThrow(/reserved/);
    expect(() => validateSlug("site-42")).toThrow(/reserved/);
    expect(() => validateSlug("abc123def456")).toThrow(/hyphen/);
  });
});

describe("validateCustomHost", () => {
  it("accepts www subdomains", () => {
    expect(validateCustomHost("www.client.com")).toBe("www.client.com");
    expect(validateCustomHost("Shop.Client.COM")).toBe("shop.client.com");
  });

  it("rejects apex domains with registrar guidance", () => {
    expect(() => validateCustomHost("client.com")).toThrow(/Root domains/);
  });

  it("rejects IPs, localhost and our own hosts", () => {
    expect(() => validateCustomHost("1.2.3.4")).toThrow(/IP address/);
    expect(() => validateCustomHost("a.b.localhost")).toThrow(/valid domain/);
    expect(() =>
      validateCustomHost(`x.y.${freeSubdomainBase()}`)
    ).toThrow(/not available/);
  });

  it("allows bare localhost / 127.0.0.1 with optional port for local testing", () => {
    expect(validateCustomHost("localhost")).toBe("localhost");
    expect(validateCustomHost("localhost:4322")).toBe("localhost:4322");
    expect(validateCustomHost("127.0.0.1")).toBe("127.0.0.1");
    expect(validateCustomHost("127.0.0.1:4322")).toBe("127.0.0.1:4322");
    expect(validateCustomHost("LOCALHOST:4322")).toBe("localhost:4322");
  });
});
