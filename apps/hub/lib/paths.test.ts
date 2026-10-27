import { describe, expect, it } from "vitest";

import { agencyHref, projectSubpath, repoPath } from "@/lib/paths";
import { businessInfoUrl, sectionUrl } from "@/components/agency/business-info-config";

describe("repoPath", () => {
  it("builds the project root and nested pages", () => {
    expect(repoPath(42)).toBe("/p/42");
    expect(repoPath(42, "agency", "booking")).toBe("/p/42/agency/booking");
  });
});

describe("projectSubpath", () => {
  it("strips the project prefix", () => {
    expect(projectSubpath("/p/42/marketing/budget")).toBe("/marketing/budget");
    expect(projectSubpath("/p/1000000000123/business-info")).toBe("/business-info");
  });

  it("maps the project root to /", () => {
    expect(projectSubpath("/p/42")).toBe("/");
  });

  it("leaves hub-wide paths alone", () => {
    expect(projectSubpath("/account")).toBe("/account");
    expect(projectSubpath("/")).toBe("/");
  });
});

describe("agencyHref", () => {
  it("scopes agency pages to their project", () => {
    expect(agencyHref(42, "/agency/booking")).toBe("/p/42/agency/booking");
    expect(agencyHref(42, "/marketing/search-terms")).toBe("/p/42/marketing/search-terms");
  });

  it("maps / to the project home (no trailing slash)", () => {
    expect(agencyHref(42, "/")).toBe("/p/42");
  });

  // Two agency projects of the same owner never share URLs.
  it("keeps projects apart", () => {
    expect(agencyHref(1, "/agency")).not.toBe(agencyHref(2, "/agency"));
  });
});

describe("business info urls", () => {
  it("lives under the project", () => {
    expect(businessInfoUrl(42)).toBe("/p/42/business-info");
    expect(sectionUrl(42, "keywords")).toBe("/p/42/business-info/keywords");
  });
});
