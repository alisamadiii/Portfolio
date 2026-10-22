import { describe, expect, it } from "vitest";

import {
  MAX_FIELDS,
  isEmail,
  stripUrl,
  tooFast,
} from "@workspace/trpc/lib/agency/lead-capture";

describe("stripUrl", () => {
  it("keeps utm and click id params", () => {
    expect(
      stripUrl("https://site.com/brakes?utm_source=google&gclid=abc&utm_medium=cpc")
    ).toBe("https://site.com/brakes?utm_source=google&gclid=abc&utm_medium=cpc");
  });

  it("drops params that can hold personal data", () => {
    expect(stripUrl("https://site.com/thanks?email=a%40b.com&name=Jo&utm_source=fb")).toBe(
      "https://site.com/thanks?utm_source=fb"
    );
  });

  it("drops the hash", () => {
    expect(stripUrl("https://site.com/a#token=secret")).toBe("https://site.com/a");
  });

  it("returns a bare path when nothing is kept", () => {
    expect(stripUrl("https://site.com/contact?ref=x")).toBe("https://site.com/contact");
  });

  it("rejects non http urls like javascript:", () => {
    expect(stripUrl("javascript:alert(1)")).toBeNull();
  });

  it("returns null for garbage and empty input", () => {
    expect(stripUrl("not a url")).toBeNull();
    expect(stripUrl("")).toBeNull();
    expect(stripUrl(undefined)).toBeNull();
  });

  it("matches kept params case-insensitively", () => {
    expect(stripUrl("https://site.com/?GCLID=x")).toBe("https://site.com/?GCLID=x");
  });
});

describe("isEmail", () => {
  it("accepts a normal address", () => {
    expect(isEmail("jo@site.com")).toBe(true);
  });

  it("rejects header injection and lists", () => {
    expect(isEmail("jo@site.com\r\nBcc: x@y.com")).toBe(false);
    expect(isEmail("a@b.com, c@d.com")).toBe(false);
  });

  it("rejects missing domain dot and empty input", () => {
    expect(isEmail("jo@localhost")).toBe(false);
    expect(isEmail("")).toBe(false);
    expect(isEmail(null)).toBe(false);
  });

  it("rejects addresses over 254 chars", () => {
    expect(isEmail(`${"a".repeat(250)}@b.com`)).toBe(false);
  });
});

describe("tooFast", () => {
  it("flags a submit under two seconds after load", () => {
    expect(tooFast(300)).toBe(true);
  });

  it("passes a human paced submit", () => {
    expect(tooFast(8000)).toBe(false);
  });

  it("passes when the timer is missing (cached older script)", () => {
    expect(tooFast(undefined)).toBe(false);
  });
});

describe("limits", () => {
  it("allows up to 40 form fields", () => {
    expect(MAX_FIELDS).toBe(40);
  });
});
