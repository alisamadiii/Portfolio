import { describe, expect, it } from "vitest";

import {
  importPath,
  industryOf,
  isSafeKey,
  NON_SITE_FILES,
  sitePagePath,
  siteKey,
} from "@workspace/trpc/lib/client-websites-shared";

describe("isSafeKey", () => {
  it("accepts normal keys", () => {
    expect(isSafeKey("joes-plumbing/index.html")).toBe(true);
    expect(isSafeKey("joes-plumbing/images/hero.webp")).toBe(true);
  });

  it("rejects traversal, empty segments and backslashes", () => {
    for (const bad of ["", "a/../b", "a/./b", "a//b", "/a", "a/", "a\\b", ".."]) {
      expect(isSafeKey(bad)).toBe(false);
    }
  });
});

describe("siteKey", () => {
  it("resolves folders to index.html like a static host", () => {
    expect(siteKey("joe", "")).toBe("joe/index.html");
    expect(siteKey("joe", "about/")).toBe("joe/about/index.html");
  });

  it("keeps file paths as they are", () => {
    expect(siteKey("joe", "about")).toBe("joe/about");
    expect(siteKey("joe", "css/site.css")).toBe("joe/css/site.css");
  });
});

describe("importPath", () => {
  it("strips the folder prefix", () => {
    expect(importPath("joe", "joe/index.html")).toBe("index.html");
    expect(importPath("joe", "joe/images/a.png")).toBe("images/a.png");
  });

  it("skips the agency-only files at the folder root", () => {
    expect(NON_SITE_FILES).toEqual(["_meta.json", "presentation.html", "preview.mp4", "preview.jpg"]);
    for (const file of NON_SITE_FILES) expect(importPath("joe", `joe/${file}`)).toBeNull();
  });

  it("keeps same-named files deeper in the site", () => {
    expect(importPath("joe", "joe/images/preview.jpg")).toBe("images/preview.jpg");
  });

  it("ignores other folders, the folder itself and unsafe keys", () => {
    expect(importPath("joe", "joey/index.html")).toBeNull();
    expect(importPath("joe", "joe/")).toBeNull();
    expect(importPath("joe", "joe/a//b.html")).toBeNull();
  });
});

describe("industryOf", () => {
  it("matches the business category", () => {
    expect(industryOf(undefined, "Used car dealer & auto repair")).toBe("automotive");
    expect(industryOf(undefined, "Plumber")).toBe("home-services");
  });

  it("uses showcase.industry when it is a known id", () => {
    expect(industryOf("health", "Plumber")).toBe("health");
    expect(industryOf("Auto repair", "Plumber")).toBe("home-services");
  });

  it("falls back to other", () => {
    expect(industryOf(undefined, undefined)).toBe("other");
    expect(industryOf(undefined, "Law firm")).toBe("other");
  });
});

describe("sitePagePath", () => {
  it("addresses index.html pages by their folder", () => {
    expect(sitePagePath("joe", "index.html")).toBe("/client-websites/joe/");
    expect(sitePagePath("joe", "services/index.html")).toBe("/client-websites/joe/services/");
    expect(sitePagePath("joe", "about.html")).toBe("/client-websites/joe/about.html");
  });
});
