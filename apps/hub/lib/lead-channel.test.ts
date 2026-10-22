import { describe, expect, it } from "vitest";

import { classifyLead } from "@workspace/trpc/lib/agency/lead-channel";

const site = "jaxautolab.com";

// Agency lead channels: one named case per rule, plus the edge cases that
// decide ad vs organic. Add-only: never edit a case, add a new one.
describe("classifyLead", () => {
  it("manual source is manual even with a click id", () => {
    expect(classifyLead({ source: "manual", gclid: "abc1234567" })).toBe("manual");
  });

  it("gclid is google_ads", () => {
    expect(classifyLead({ gclid: "Cj0KCQjw123", siteHost: site })).toBe("google_ads");
  });

  it("gbraid and wbraid (iOS ad clicks) are google_ads", () => {
    expect(classifyLead({ gbraid: "0AAAAA123456" })).toBe("google_ads");
    expect(classifyLead({ wbraid: "CkkKCQ123456" })).toBe("google_ads");
  });

  it("click id wins over an organic referrer (ad click kept for 90 days)", () => {
    expect(
      classifyLead({ gclid: "Cj0KCQjw123", referrer: "https://www.google.com/", siteHost: site })
    ).toBe("google_ads");
  });

  it("utm google/cpc without a click id is google_ads", () => {
    expect(classifyLead({ utm: { source: "google", medium: "cpc" } })).toBe("google_ads");
  });

  it("utm source casing and spaces don't matter", () => {
    expect(classifyLead({ utm: { source: " Google ", medium: "CPC" } })).toBe("google_ads");
  });

  it("other paid medium is paid_other", () => {
    expect(classifyLead({ utm: { source: "facebook", medium: "paid_social" } })).toBe("paid_other");
    expect(classifyLead({ utm: { source: "bing", medium: "cpc" } })).toBe("paid_other");
  });

  it("email medium or newsletter source is email", () => {
    expect(classifyLead({ utm: { source: "x", medium: "email" } })).toBe("email");
    expect(classifyLead({ utm: { source: "usesend" } })).toBe("email");
  });

  it("google referrer is organic_search", () => {
    expect(classifyLead({ referrer: "https://www.google.com/", siteHost: site })).toBe(
      "organic_search"
    );
  });

  it("country google domains and maps.google are organic_search", () => {
    expect(classifyLead({ referrer: "https://www.google.co.uk/" })).toBe("organic_search");
    expect(classifyLead({ referrer: "https://maps.google.com/" })).toBe("organic_search");
  });

  it("bing and duckduckgo referrers are organic_search", () => {
    expect(classifyLead({ referrer: "https://www.bing.com/search?q=x" })).toBe("organic_search");
    expect(classifyLead({ referrer: "https://duckduckgo.com/" })).toBe("organic_search");
  });

  it("utm medium organic is organic_search (Google Business Profile links)", () => {
    expect(classifyLead({ utm: { source: "gbp", medium: "organic" } })).toBe("organic_search");
  });

  it("social referrers are social", () => {
    expect(classifyLead({ referrer: "https://l.facebook.com/l.php?u=x" })).toBe("social");
    expect(classifyLead({ referrer: "https://t.co/abc" })).toBe("social");
    expect(classifyLead({ referrer: "https://nextdoor.com/p/1" })).toBe("social");
  });

  it("utm medium social is social", () => {
    expect(classifyLead({ utm: { source: "instagram", medium: "social" } })).toBe("social");
  });

  it("other external referrer is referral", () => {
    expect(classifyLead({ referrer: "https://yellowpages.com/x", siteHost: site })).toBe(
      "referral"
    );
  });

  it("referrer on the client's own site is direct (internal navigation)", () => {
    expect(classifyLead({ referrer: "https://jaxautolab.com/services", siteHost: site })).toBe(
      "direct"
    );
    expect(classifyLead({ referrer: "https://www.jaxautolab.com/", siteHost: site })).toBe(
      "direct"
    );
  });

  it("referrer on a subdomain of the client's site is direct", () => {
    expect(classifyLead({ referrer: "https://book.jaxautolab.com/", siteHost: site })).toBe(
      "direct"
    );
  });

  it("t.co pattern doesn't match unrelated hosts ending in t.co", () => {
    expect(classifyLead({ referrer: "https://reddit.com/", siteHost: site })).toBe("social");
    expect(classifyLead({ referrer: "https://microsoft.com/", siteHost: site })).toBe("referral");
  });

  it("unknown utm source with no referrer is referral (QR code, flyer)", () => {
    expect(classifyLead({ utm: { source: "flyer" } })).toBe("referral");
  });

  it("nothing at all is direct", () => {
    expect(classifyLead({})).toBe("direct");
    expect(classifyLead({ source: "form", referrer: "" })).toBe("direct");
  });

  it("garbage referrer is direct", () => {
    expect(classifyLead({ referrer: "not a url" })).toBe("direct");
  });
});
