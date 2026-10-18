import { describe, expect, it } from "vitest";

import {
  isPreviewBranch,
  isValidBranchName,
  slugifyBranchName,
} from "./branch-name";

describe("isValidBranchName", () => {
  it("accepts plain slugs and nested names", () => {
    expect(isValidBranchName("new-hero-test")).toBe(true);
    expect(isValidBranchName("experiments/summer-sale")).toBe(true);
  });

  it("rejects the reserved preview/ prefix", () => {
    expect(isValidBranchName("preview/abc123")).toBe(false);
  });

  it("rejects git-illegal refs", () => {
    for (const bad of [
      "",
      "-leading",
      "/leading",
      ".hidden",
      "trailing/",
      "trailing.",
      "name.lock",
      "a..b",
      "a//b",
      "has space",
      "has~tilde",
      "has^caret",
      "has:colon",
      "has?mark",
      "has*star",
      "has[bracket",
      "has\\backslash",
      "a@{b",
      "@",
      "x".repeat(101),
    ]) {
      expect(isValidBranchName(bad), bad).toBe(false);
    }
  });
});

describe("slugifyBranchName", () => {
  it("lowercases, hyphenates and trims", () => {
    expect(slugifyBranchName("New hero test")).toBe("new-hero-test");
    expect(slugifyBranchName("  Summer Sale!! 2026 ")).toBe("summer-sale-2026");
    expect(slugifyBranchName("Café Menu")).toBe("cafe-menu");
    expect(slugifyBranchName("***")).toBe("");
  });

  it("caps at 60 chars and stays a valid branch name", () => {
    const slug = slugifyBranchName("word ".repeat(20));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
    expect(isValidBranchName(slug)).toBe(true);
  });
});

describe("isPreviewBranch", () => {
  it("only matches the preview/ prefix", () => {
    expect(isPreviewBranch("preview/abc")).toBe(true);
    expect(isPreviewBranch("previews")).toBe(false);
    expect(isPreviewBranch("main")).toBe(false);
  });
});
