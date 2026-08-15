import { describe, expect, it } from "vitest";

import { camelCase, entryNameForPage, routeForPage } from "../src/cli/core/routes.js";
import { assignPaths, roleForTag } from "../src/cli/core/naming.js";
import {
  addAtPath,
  canAddPath,
  flattenPaths,
  orderedForWrite,
} from "../src/cli/core/json-store.js";
import { fieldForValue, fieldsForObject } from "../src/cli/core/fields.js";
import { buildReport } from "../src/cli/core/report.js";
import {
  ensureEntry,
  ensureLinkComponent,
  ensureMedia,
  ensurePreviewGlobal,
  loadPagesYml,
  savePagesYml,
} from "../src/cli/core/pages-yml.js";
import { lintPagesYml } from "../src/cli/commands/check.js";
import type { CandidateField } from "../src/cli/types.js";

describe("routes", () => {
  it("derives routes", () => {
    expect(routeForPage("index.astro")).toBe("/");
    expect(routeForPage("our-story.astro")).toBe("/our-story");
    expect(routeForPage("blog/[slug].astro")).toBeNull();
  });
  it("derives entry names", () => {
    expect(entryNameForPage("index.astro")).toBe("home");
    expect(entryNameForPage("our-story.astro")).toBe("ourStory");
  });
  it("camelCases", () => {
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

  it("numbers collisions against taken paths and never renumbers on re-run", () => {
    const make = (role: CandidateField["role"]): CandidateField => ({
      role,
      tag: "p",
      sectionChain: ["hero"],
      line: 1,
      el: { start: 0, name: "p" },
    });
    const a = make("text");
    const b = make("text");
    const taken = new Set(["hero.text3"]);
    assignPaths([a, b], taken);
    expect(a.path).toBe("hero.text");
    expect(b.path).toBe("hero.text2");
    // re-run with previous results adopted
    const c = make("text");
    assignPaths([c], new Set(["hero.text", "hero.text2", "hero.text3"]));
    expect(c.path).toBe("hero.text4");
  });
});

describe("json-store", () => {
  it("existing values always win", () => {
    const target: Record<string, unknown> = { hero: { heading: "keep" } };
    expect(addAtPath(target, "hero.heading", "new")).toBe(false);
    expect((target.hero as Record<string, unknown>).heading).toBe("keep");
    expect(addAtPath(target, "hero.text", "added")).toBe(true);
  });
  it("refuses paths through non-objects", () => {
    expect(canAddPath({ hero: "scalar" }, "hero.heading")).toBe(false);
    expect(canAddPath({}, "hero.heading")).toBe(true);
  });
  it("orders seo first", () => {
    expect(Object.keys(orderedForWrite({ b: 1, seo: {}, a: 2 }))).toEqual([
      "seo",
      "b",
      "a",
    ]);
  });
  it("flattens all levels", () => {
    expect(flattenPaths({ a: { b: "x" } })).toEqual(["a", "a.b"]);
  });
});

describe("fields inference", () => {
  it("detects link objects, images, and typed strings", () => {
    expect(fieldForValue("cta", { label: "Go", link: "/x" })).toMatchObject({
      component: "link",
    });
    expect(fieldForValue("image", "/media/x.jpg")).toMatchObject({ type: "image" });
    expect(fieldForValue("email", "a@b.c")).toMatchObject({
      options: { type: "email" },
    });
    expect(fieldForValue("orderUrl", "https://x.com")).toMatchObject({
      options: { type: "url" },
    });
  });
  it("builds collapsible object lists with a primary summary", () => {
    const field = fieldForValue("items", [{ name: "A", price: "$1" }]);
    expect(field).toMatchObject({
      type: "object",
      list: { collapsible: { summary: "{fields.name}" } },
    });
  });
  it("skips seo in object inference", () => {
    expect(fieldsForObject({ seo: { title: "x" }, hero: { heading: "y" } })).toHaveLength(1);
  });
});

describe("report", () => {
  it("embeds the full conventions contract from docs/", () => {
    const report = buildReport([]);
    expect(report).toContain("## The CMS conventions contract");
    expect(report).toContain("data-cms-field");
    expect(report).toContain("Idempotency rules");
  });
});

describe("pages-yml merge", () => {
  const base = `media:
  input: public/media
  output: /media

# keep this comment
content:
  - name: site
    type: file
    path: src/data/site.json
    fields:
      - { name: name, label: Business name, type: string }
`;

  it("is append-only and preserves comments", () => {
    const doc = loadPagesYml(base);
    expect(ensureMedia(doc)).toBe(false); // exists
    expect(ensureLinkComponent(doc)).toBe(true);
    expect(ensurePreviewGlobal(doc, "site")).toBe(true);
    expect(ensurePreviewGlobal(doc, "site")).toBe(false); // second time no-op
    const result = ensureEntry(doc, {
      name: "site",
      type: "file",
      path: "src/data/site.json",
      fields: [
        { name: "name", type: "string", label: "SHOULD NOT REPLACE" },
        { name: "tagline", type: "string", label: "Tagline" },
      ],
    });
    expect(result.created).toBe(false);
    expect(result.fieldsAdded).toBe(1); // only tagline
    const out = savePagesYml(doc);
    expect(out).toContain("# keep this comment");
    expect(out).toContain("Business name"); // existing label untouched
    expect(out).not.toContain("SHOULD NOT REPLACE");
    expect(out).toContain("tagline");
  });

  it("lints duplicates recursively", () => {
    const warnings = lintPagesYml(`content:
  - name: site
    type: file
    path: src/data/site.json
    fields:
      - name: seo
        type: object
        fields:
          - { name: title, type: string }
          - { name: title, type: string }
`);
    expect(warnings.some((warning) => warning.includes('duplicate field "title"'))).toBe(
      true
    );
  });
});
