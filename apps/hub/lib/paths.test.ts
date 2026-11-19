import { describe, expect, it } from "vitest";

import { appPath, isProjectId, projectLink } from "@/lib/paths";
import { businessInfoUrl, sectionUrl } from "@/components/agency/business-info-config";

// DELIBERATE CHANGE (2026-10-29): project ids are uuids (hub_project.id), not
// numeric GitHub repo ids; assertions below were rewritten with uuids.
// DELIBERATE CHANGE (2026-11-19): the workspace focuses on one project at a
// time, so pages lost their /p/<projectId> prefix. repoPath, projectSubpath and
// agencyHref are gone; appPath builds id-less pages and projectLink builds the
// cross-project links the /p/[projectId] route handler resolves.
const A = "3f2b6c1e-8d4a-4b7e-9c2d-1a5e6f7b8c9d";
const B = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("appPath", () => {
  it("builds Home and nested pages without a project prefix", () => {
    expect(appPath()).toBe("/");
    expect(appPath("leads")).toBe("/leads");
    expect(appPath("resend", "em_1")).toBe("/resend/em_1");
  });

  it("drops empty segments", () => {
    expect(appPath("", "settings")).toBe("/settings");
  });
});

describe("projectLink", () => {
  it("keeps the project id for cross-project links", () => {
    expect(projectLink(A)).toBe(`/p/${A}`);
    expect(projectLink(A, "billing")).toBe(`/p/${A}/billing`);
  });

  it("keeps projects apart", () => {
    expect(projectLink(A)).not.toBe(projectLink(B));
  });
});

describe("business info urls", () => {
  it("lives at the top level of the workspace", () => {
    expect(businessInfoUrl()).toBe("/business-info");
    expect(sectionUrl("keywords")).toBe("/business-info/keywords");
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
