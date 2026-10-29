import { describe, expect, it } from "vitest";

import { agencyHref, isProjectId, projectSubpath, repoPath } from "@/lib/paths";
import { businessInfoUrl, sectionUrl } from "@/components/agency/business-info-config";

// DELIBERATE CHANGE (2026-10-29): project ids are uuids (hub_project.id), not
// numeric GitHub repo ids; assertions below were rewritten with uuids.
const A = "3f2b6c1e-8d4a-4b7e-9c2d-1a5e6f7b8c9d";
const B = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("repoPath", () => {
  it("builds the project root and nested pages", () => {
    expect(repoPath(A)).toBe(`/p/${A}`);
    expect(repoPath(A, "agency", "booking")).toBe(`/p/${A}/agency/booking`);
  });
});

describe("projectSubpath", () => {
  it("strips the project prefix", () => {
    expect(projectSubpath(`/p/${A}/marketing/budget`)).toBe("/marketing/budget");
    expect(projectSubpath(`/p/${B}/business-info`)).toBe("/business-info");
  });

  it("maps the project root to /", () => {
    expect(projectSubpath(`/p/${A}`)).toBe("/");
  });

  it("leaves hub-wide paths alone", () => {
    expect(projectSubpath("/account")).toBe("/account");
    expect(projectSubpath("/")).toBe("/");
  });
});

describe("agencyHref", () => {
  it("scopes agency pages to their project", () => {
    expect(agencyHref(A, "/agency/booking")).toBe(`/p/${A}/agency/booking`);
    expect(agencyHref(A, "/marketing/search-terms")).toBe(`/p/${A}/marketing/search-terms`);
  });

  it("maps / to the project home (no trailing slash)", () => {
    expect(agencyHref(A, "/")).toBe(`/p/${A}`);
  });

  // Two agency projects of the same owner never share URLs.
  it("keeps projects apart", () => {
    expect(agencyHref(A, "/agency")).not.toBe(agencyHref(B, "/agency"));
  });
});

describe("business info urls", () => {
  it("lives under the project", () => {
    expect(businessInfoUrl(A)).toBe(`/p/${A}/business-info`);
    expect(sectionUrl(A, "keywords")).toBe(`/p/${A}/business-info/keywords`);
  });
});

describe("isProjectId", () => {
  it("accepts a uuid and rejects legacy numeric repo ids", () => {
    expect(isProjectId(A)).toBe(true);
    expect(isProjectId("1290180826")).toBe(false);
    expect(isProjectId("")).toBe(false);
    expect(isProjectId(undefined)).toBe(false);
  });
});

describe("projectSubpath (legacy numeric)", () => {
  it("leaves an old numeric /p/<repoId> path untouched", () => {
    expect(projectSubpath("/p/42/marketing")).toBe("/p/42/marketing");
  });
});
