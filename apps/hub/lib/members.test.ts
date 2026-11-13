import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  canManageMember,
  memberStatus,
} from "@workspace/trpc/lib/cms/members-shared";

import { projectCoreNav } from "./apps";

const now = new Date("2026-11-13T12:00:00Z");
const later = new Date("2026-11-14T12:00:00Z");
const earlier = new Date("2026-11-12T12:00:00Z");

describe("memberStatus", () => {
  it("a bound collaborator is active, whatever the invite says", () => {
    expect(memberStatus("user_1", null, now)).toBe("active");
    expect(memberStatus("user_1", earlier, now)).toBe("active");
  });

  it("an unbound collaborator with a valid link is pending", () => {
    expect(memberStatus(null, later, now)).toBe("pending");
  });

  it("an unbound collaborator with an expired or missing link is expired (grants nothing)", () => {
    expect(memberStatus(null, earlier, now)).toBe("expired");
    expect(memberStatus(null, now, now)).toBe("expired");
    expect(memberStatus(null, null, now)).toBe("expired");
  });
});

describe("member management rules", () => {
  it("only admins/owners can grant full access", () => {
    expect(assignableRoles(true)).toContain("full-access");
    expect(assignableRoles(false)).not.toContain("full-access");
    expect(assignableRoles(false)).toEqual(["content-editor", "view-only"]);
  });

  it("a full-access collaborator can't change or remove another full-access member", () => {
    expect(canManageMember("full-access", false)).toBe(false);
    expect(canManageMember("content-editor", false)).toBe(true);
    expect(canManageMember("view-only", false)).toBe(true);
    expect(canManageMember("full-access", true)).toBe(true);
  });
});

describe("projectCoreNav", () => {
  const ids = (o: { netlify: boolean; members: boolean }) => projectCoreNav(o).map((i) => i.id);

  it("Members sits right below Business info for managers", () => {
    expect(ids({ netlify: false, members: true })).toEqual([
      "home",
      "website",
      "business-info",
      "members",
    ]);
    expect(ids({ netlify: true, members: true })).toEqual([
      "home",
      "website",
      "business-info",
      "members",
      "netlify",
    ]);
  });

  it("Members is hidden for content editors and view-only", () => {
    expect(ids({ netlify: false, members: false })).not.toContain("members");
  });
});
