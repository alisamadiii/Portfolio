import { describe, expect, it } from "vitest";

import {
  checkTypeLabel,
  formatPct,
  pagePath,
  problemsForAi,
  shortDuration,
  siteHost,
  type SitewatchIncident,
} from "@workspace/trpc/lib/sitewatch-shared";

const incident = (over: Partial<SitewatchIncident> = {}): SitewatchIncident => ({
  id: "1",
  checkType: "seo",
  severity: "warning",
  message: "Title longer than 65 characters",
  pageUrl: "https://www.acme.com/showcase",
  details: null,
  firstSeenAt: "2026-11-01T00:00:00.000Z",
  lastSeenAt: "2026-11-20T00:00:00.000Z",
  resolvedAt: null,
  ignoredAt: null,
  ...over,
});

describe("siteHost", () => {
  it("matches www and apex as one site", () => {
    expect(siteHost("https://www.acme.com")).toBe("acme.com");
    expect(siteHost("acme.com")).toBe("acme.com");
    expect(siteHost("http://WWW.Acme.com/about?x=1")).toBe("acme.com");
  });

  it("keeps other subdomains", () => {
    expect(siteHost("https://shop.acme.com")).toBe("shop.acme.com");
  });

  it("returns null for junk", () => {
    expect(siteHost("not a url")).toBeNull();
    expect(siteHost("")).toBeNull();
  });
});

describe("pagePath", () => {
  it("shows a path for pages on the site, www-insensitive", () => {
    expect(pagePath("https://www.acme.com/showcase", "https://acme.com")).toBe("/showcase");
    expect(pagePath("https://acme.com", "https://www.acme.com")).toBe("/");
    expect(pagePath("https://acme.com/a?b=1", "https://acme.com")).toBe("/a?b=1");
  });

  it("keeps the full URL for other sites and junk", () => {
    expect(pagePath("https://design.com/x", "https://acme.com")).toBe("https://design.com/x");
    expect(pagePath("weird", "https://acme.com")).toBe("weird");
  });
});

describe("checkTypeLabel", () => {
  it("names known checks in plain English", () => {
    expect(checkTypeLabel("perf")).toBe("Speed");
    expect(checkTypeLabel("external_link")).toBe("Dead link");
    expect(checkTypeLabel("email_dns")).toBe("Email setup");
  });

  it("falls back to the raw type without underscores", () => {
    expect(checkTypeLabel("new_check_type")).toBe("new check type");
  });
});

describe("formatPct", () => {
  it("shows 3 decimals like sitewatch, dash for no data", () => {
    expect(formatPct(99.6123)).toBe("99.612%");
    expect(formatPct(100)).toBe("100%");
    expect(formatPct(null)).toBe("—");
  });
});

describe("problemsForAi", () => {
  it("lists the site and every problem with its page path", () => {
    const text = problemsForAi({ name: "Acme", baseUrl: "https://www.acme.com" }, [
      incident(),
      incident({ severity: "error", checkType: "http_status", message: "Page returns 500", pageUrl: "https://acme.com/x", details: { status: 500 } }),
    ]);
    expect(text).toContain("Website: Acme (https://www.acme.com)");
    expect(text).toContain("- [warning] Title longer than 65 characters (seo, page /showcase)");
    expect(text).toContain("- [error] Page returns 500 (http_status, page /x)");
    expect(text).toContain('details: {"status":500}');
  });
});

describe("shortDuration", () => {
  it("drops empty leading units", () => {
    expect(shortDuration(((23 * 24 + 13) * 60 + 19) * 60_000)).toBe("23d 13h 19m");
    expect(shortDuration((4 * 60 + 2) * 60_000)).toBe("4h 2m");
    expect(shortDuration(3 * 60_000 + 59_000)).toBe("3m");
    expect(shortDuration(-5)).toBe("0m");
  });
});
