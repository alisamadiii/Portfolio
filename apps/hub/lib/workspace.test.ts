import { describe, expect, it } from "vitest";

import { pickWorkspaceProject, safeWorkspacePath } from "@/lib/workspace";

const A = { projectId: "3f2b6c1e-8d4a-4b7e-9c2d-1a5e6f7b8c9d" };
const B = { projectId: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d" };

describe("pickWorkspaceProject", () => {
  it("opens the cookie's project when it is still accessible", () => {
    expect(pickWorkspaceProject(B.projectId, [A, B])).toBe(B);
  });

  it("falls back to the first project when the cookie points elsewhere", () => {
    expect(pickWorkspaceProject("1111aaaa-2222-4333-8444-555566667777", [A, B])).toBe(A);
  });

  it("ignores a malformed cookie", () => {
    expect(pickWorkspaceProject("42", [A, B])).toBe(A);
    expect(pickWorkspaceProject(undefined, [A, B])).toBe(A);
  });

  it("returns null with no projects", () => {
    expect(pickWorkspaceProject(A.projectId, [])).toBeNull();
  });
});

describe("safeWorkspacePath", () => {
  it("keeps same-origin paths and rejects everything else", () => {
    expect(safeWorkspacePath("/leads?tab=conversations")).toBe("/leads?tab=conversations");
    expect(safeWorkspacePath("//evil.com")).toBe("/");
    expect(safeWorkspacePath("https://evil.com")).toBe("/");
    expect(safeWorkspacePath(undefined)).toBe("/");
  });
});
