import { describe, expect, it } from "vitest";

import { friendlyFileLabel } from "./file-labels";

describe("friendlyFileLabel", () => {
  it("names CMS contract files", () => {
    expect(friendlyFileLabel("_site.json")).toBe("Site settings");
    expect(friendlyFileLabel("_pages.json")).toBe("Page content");
    expect(friendlyFileLabel("_collections/blog.json")).toBe("Blog entries");
  });

  it("names components, layouts and pages", () => {
    expect(friendlyFileLabel("src/components/Header.astro")).toBe(
      "Header component"
    );
    expect(friendlyFileLabel("src/components/CheckList.astro")).toBe(
      "Check List component"
    );
    expect(friendlyFileLabel("src/layouts/Base.astro")).toBe("Base layout");
    expect(friendlyFileLabel("src/pages/index.astro")).toBe("Home page");
    expect(friendlyFileLabel("src/pages/about.astro")).toBe("About page");
    expect(friendlyFileLabel("src/pages/services/roofing.astro")).toBe(
      "Services Roofing page"
    );
  });

  it("groups stylesheets as site styles", () => {
    expect(friendlyFileLabel("src/styles/global.css")).toBe("Site styles");
    expect(friendlyFileLabel("styles/theme.css")).toBe("Site styles");
  });

  it("falls back to a title-cased stem", () => {
    expect(friendlyFileLabel("astro.config.mjs")).toBe("Astro.config");
    expect(friendlyFileLabel("src/data/cities.ts")).toBe("Cities");
    expect(friendlyFileLabel("public/hero.webp")).toBe("hero.webp (asset)");
  });
});
