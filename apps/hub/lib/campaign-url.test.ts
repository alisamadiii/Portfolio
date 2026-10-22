import { describe, expect, it } from "vitest";

import { buildCampaignUrl } from "./campaign-url";

const base = {
  url: "https://agency.alisamadii.com/",
  source: "instagram",
  medium: "social",
};

describe("buildCampaignUrl", () => {
  it("matches Google's Campaign URL Builder output", () => {
    expect(
      buildCampaignUrl({ ...base, campaign: "ig-profile", id: "24380419404" })
    ).toBe(
      "https://agency.alisamadii.com/?utm_source=instagram&utm_medium=social&utm_campaign=ig-profile&utm_id=24380419404"
    );
  });

  it("needs source and medium before it builds anything", () => {
    expect(buildCampaignUrl({ ...base, source: "" })).toBeNull();
    expect(buildCampaignUrl({ ...base, medium: "  " })).toBeNull();
  });

  it("rejects an invalid or non-http landing page", () => {
    expect(buildCampaignUrl({ ...base, url: "agency" })).toBeNull();
    expect(buildCampaignUrl({ ...base, url: "javascript:alert(1)" })).toBeNull();
  });

  it("keeps the landing page's own query params", () => {
    expect(
      buildCampaignUrl({ ...base, url: "https://x.com/page?ref=1" })
    ).toBe("https://x.com/page?ref=1&utm_source=instagram&utm_medium=social");
  });

  it("leaves optional params out when empty", () => {
    expect(buildCampaignUrl(base)).toBe(
      "https://agency.alisamadii.com/?utm_source=instagram&utm_medium=social"
    );
  });

  it("includes term and content when given", () => {
    const url = buildCampaignUrl({ ...base, term: "pest control", content: "story" })!;
    expect(url).toContain("utm_term=pest+control");
    expect(url).toContain("utm_content=story");
  });

  it("trims whitespace from every field", () => {
    expect(
      buildCampaignUrl({ url: " https://x.com ", source: " ig ", medium: " social " })
    ).toBe("https://x.com/?utm_source=ig&utm_medium=social");
  });
});
