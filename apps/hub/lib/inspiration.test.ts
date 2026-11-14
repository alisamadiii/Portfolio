import { describe, expect, it } from "vitest";

import {
  buildTree,
  coverImages,
  countImages,
  humanize,
  imageKey,
  isFolderPath,
  isFolderSegment,
  isImageName,
  nextFolderName,
  promptId,
} from "@workspace/trpc/lib/inspiration-shared";

const obj = (key: string) => ({ key, url: `https://cdn.test/${key}` });

describe("buildTree", () => {
  const tree = buildTree([
    obj("inspiration/_prompts.json"),
    obj("inspiration/02-landing-pages/.keep"),
    obj("inspiration/01-hero-sections/.keep"),
    obj("inspiration/01-hero-sections/10-law-firm/.keep"),
    obj("inspiration/01-hero-sections/02-pest-control/100-aaa.webp"),
    obj("inspiration/01-hero-sections/02-pest-control/300-ccc.png"),
    obj("inspiration/01-hero-sections/02-pest-control/200-bbb.jpg"),
    obj("inspiration/01-hero-sections/02-pest-control/notes.txt"),
    obj("other/01-x/1-a.png"),
    obj("inspiration/stray.png"),
    obj("inspiration/Bad Folder/1-a.png"),
  ]);

  it("nests folders and sorts them by their number", () => {
    expect(tree.map((f) => f.name)).toEqual(["01-hero-sections", "02-landing-pages"]);
    expect(tree[0]!.children.map((f) => f.name)).toEqual(["02-pest-control", "10-law-firm"]);
    expect(tree[0]!.children[0]!.path).toBe("01-hero-sections/02-pest-control");
  });

  it("keeps empty folders that only have a marker", () => {
    expect(tree[1]!.images).toEqual([]);
    expect(tree[0]!.children[1]!.title).toBe("Law Firm");
  });

  it("lists images newest first and skips other files", () => {
    const pest = tree[0]!.children[0]!;
    expect(pest.images.map((i) => i.addedAt)).toEqual([300, 200, 100]);
    expect(pest.images[0]!.url).toBe("https://cdn.test/inspiration/01-hero-sections/02-pest-control/300-ccc.png");
  });

  it("ignores prompts, other prefixes, root files and unsafe folder names", () => {
    expect(tree).toHaveLength(2);
  });

  it("counts and covers through subfolders", () => {
    expect(countImages(tree[0]!)).toBe(3);
    expect(coverImages(tree[0]!, 2).map((i) => i.addedAt)).toEqual([300, 200]);
  });
});

describe("humanize", () => {
  it("drops the number and titles the slug", () => {
    expect(humanize("07-login-and-signup")).toBe("Login & Signup");
    expect(humanize("12-faq")).toBe("FAQ");
    expect(humanize("04-hvac")).toBe("HVAC");
    expect(humanize("27-404-pages")).toBe("404 Pages");
  });
});

describe("nextFolderName", () => {
  it("numbers after the highest sibling, padded to 2", () => {
    expect(nextFolderName([], "Pricing tables")).toBe("01-pricing-tables");
    expect(nextFolderName(["01-a", "43-local-business", "07-b"], "Login & Signup")).toBe("44-login-and-signup");
    expect(nextFolderName(["99-x"], "Next")).toBe("100-next");
  });

  it("falls back to folder when the name has no letters", () => {
    expect(nextFolderName([], "!!!")).toBe("01-folder");
  });
});

describe("safe names", () => {
  it("accepts numbered slugs only as folders", () => {
    expect(isFolderSegment("01-hero-sections")).toBe(true);
    for (const bad of ["hero", "..", "01-", "01-Hero", "_prompts.json", "01-a/b", "01-a b"]) {
      expect(isFolderSegment(bad)).toBe(false);
    }
    expect(isFolderPath("01-a/02-b")).toBe(true);
    expect(isFolderPath("01-a/../02-b")).toBe(false);
    expect(isFolderPath("")).toBe(false);
  });

  it("accepts generated image names only", () => {
    expect(isImageName("1794690724314-2c1eob.webp")).toBe(true);
    for (const bad of [".keep", "a.png", "1-a.exe", "1-a/b.png", "1-a.png.svgz"]) {
      expect(isImageName(bad)).toBe(false);
    }
  });

  it("builds image keys inside the folder", () => {
    expect(imageKey("01-a/02-b", "png", 42)).toMatch(/^inspiration\/01-a\/02-b\/42-[a-z0-9]+\.png$/);
  });
});

describe("promptId", () => {
  it("slugifies and dedupes", () => {
    expect(promptId("Hero copy", [])).toBe("hero-copy");
    expect(promptId("Hero copy", ["hero-copy", "hero-copy-2"])).toBe("hero-copy-3");
    expect(promptId("???", [])).toBe("prompt");
  });
});
