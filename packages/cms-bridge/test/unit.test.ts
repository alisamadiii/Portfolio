import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { camelCase, entryNameForPage, routeForPage } from "../src/cli/core/routes.js";
import { roleForTag } from "../src/cli/core/naming.js";
import { orderedForWrite, writePagesJson } from "../src/cli/core/json-store.js";
import { openTagEnd, SpliceError } from "../src/cli/core/astro-doc.js";
import { pageBinding } from "../src/cli/core/scan.js";
import {
  ensureDataFiles,
  normalizeRoute,
  pageKeyForRoute,
  placeholderItem,
  type CmsManifest,
} from "../src/cli/core/manifest.js";
import { buildReport } from "../src/cli/core/report.js";

const tmpDirs: string[] = [];
const mkTmp = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-bridge-unit-"));
  tmpDirs.push(dir);
  return dir;
};
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

describe("routes", () => {
  it("derives routes and skips dynamic ones", () => {
    expect(routeForPage("index.astro")).toBe("/");
    expect(routeForPage("our-story.astro")).toBe("/our-story");
    expect(routeForPage("blog/[slug].astro")).toBeNull();
  });
  it("derives entry names + camelCases", () => {
    expect(entryNameForPage("index.astro")).toBe("home");
    expect(entryNameForPage("our-story.astro")).toBe("ourStory");
    expect(camelCase("join-our-team")).toBe("joinOurTeam");
  });
});

describe("naming", () => {
  it("maps tags to roles", () => {
    expect(roleForTag("h1")).toBe("heading");
    expect(roleForTag("h2")).toBe("title");
    expect(roleForTag("p")).toBe("text");
    expect(roleForTag("a")).toBe("cta");
    expect(roleForTag("div")).toBeNull();
  });
});

describe("json-store", () => {
  it("orders seo first", () => {
    expect(Object.keys(orderedForWrite({ b: 1, seo: {}, a: 2 }))).toEqual(["seo", "b", "a"]);
  });
  it("writePagesJson hoists per-page seo", () => {
    const dir = mkTmp();
    const file = path.join(dir, "pages.json");
    writePagesJson(file, { home: { hero: { heading: "h" }, seo: { title: "t" } } });
    const home = JSON.parse(fs.readFileSync(file, "utf8")).home;
    expect(Object.keys(home)).toEqual(["seo", "hero"]);
  });
});

describe("openTagEnd", () => {
  const end = (s: string) => openTagEnd(s, 0, s.slice(1).match(/^\w+/)![0]);
  it("finds the close of simple + attr'd tags", () => {
    expect(end("<p>x</p>").end).toBe(3);
    expect(end('<p class="a">x</p>').end).toBe(13);
  });
  it("ignores > inside quotes and expressions", () => {
    const s = '<a href="/a>b" data-x={a > b}>t</a>';
    const r = openTagEnd(s, 0, "a");
    expect(s.slice(r.end - 1, r.end)).toBe(">");
    expect(s[r.end]).toBe("t");
  });
  it("reports self-closing + spans multiline", () => {
    expect(openTagEnd('<img src="x" />', 0, "img").selfClosed).toBe(true);
    expect(openTagEnd("<p\n  class='x'\n>t</p>", 0, "p").selfClosed).toBe(false);
  });
  it("throws on an unterminated tag", () => {
    expect(() => openTagEnd('<p class="x', 0, "p")).toThrow(SpliceError);
  });
});

describe("pageBinding", () => {
  it("reads dot + bracket bindings", () => {
    expect(
      pageBinding(`import pages from "../data/pages.json";\nconst content = pages.home;`)
    ).toEqual({ ident: "content", pageKey: "home" });
    expect(
      pageBinding(`import pages from "../../data/pages.json";\nconst c = pages["about-us"];`)
    ).toEqual({ ident: "c", pageKey: "about-us" });
  });
  it("returns null without a binding", () => {
    expect(pageBinding(`import Layout from "./L.astro";`)).toBeNull();
    expect(pageBinding(`import pages from "../data/pages.json";`)).toBeNull();
  });
});

describe("manifest", () => {
  it("normalizes routes + resolves page keys", () => {
    const manifest = {
      version: 1,
      baseUrl: "",
      pages: { home: { route: "/" }, about: { route: "/about/" } },
      collections: [],
    } as CmsManifest;
    expect(normalizeRoute("/about/")).toBe("/about");
    expect(pageKeyForRoute(manifest, "/about")).toBe("about");
    expect(pageKeyForRoute(manifest, "/missing")).toBeNull();
  });
  it("builds placeholder items by field type", () => {
    expect(
      placeholderItem([
        { name: "title", type: "string" },
        { name: "count", type: "number" },
        { name: "live", type: "boolean" },
        { name: "photo", type: "image" },
      ])
    ).toEqual({ title: "", count: 0, live: false, photo: "" });
  });
  it("ensureDataFiles is add-only: existing keys win", () => {
    const dir = mkTmp();
    fs.mkdirSync(path.join(dir, "src/data"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src/data/cms.json"),
      JSON.stringify({ version: 1, baseUrl: "https://x.com", pages: { home: { route: "/" } }, collections: [] })
    );
    fs.writeFileSync(
      path.join(dir, "src/data/pages.json"),
      JSON.stringify({ home: { hero: { heading: "KEEP" } } })
    );
    const result = ensureDataFiles(dir, [
      { key: "home", route: "/" },
      { key: "about", route: "/about" },
    ]);
    expect(result.pagesAdded).toEqual(["about"]);
    expect(result.manifest.baseUrl).toBe("https://x.com"); // untouched
    expect((result.pagesJson.home as any).hero.heading).toBe("KEEP");
    expect(result.pagesJson.about).toEqual({});
  });
});

describe("report", () => {
  it("embeds the conventions contract + a fix recipe", () => {
    const report = buildReport([], [
      { code: "R5", file: "src/components/Card.astro", line: 1, excerpt: "shared" },
    ]);
    expect(report).toContain("CMS conventions contract");
    expect(report).toContain("R5 — Shared component");
    expect(report).not.toContain(".pages.yml");
  });
});
