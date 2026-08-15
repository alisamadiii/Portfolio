/**
 * End-to-end: run the real init pipeline against the plain-site fixture in a
 * temp directory. Covers extraction, tagging, JSON/yml generation, the
 * self-contained report, and the idempotency contract (second run = zero
 * changes).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { initCommand } from "../src/cli/commands/init.js";
import { collectionsCommand } from "../src/cli/commands/collections.js";
import { parseAstro } from "../src/cli/core/astro-doc.js";

const FIXTURE = path.join(__dirname, "fixtures", "plain-site");

let root: string;

const snapshotTree = (dir: string): Map<string, string> => {
  const out = new Map<string, string>();
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(path.relative(dir, full), fs.readFileSync(full, "utf8"));
    }
  };
  walk(dir);
  return out;
};

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "cms-bridge-e2e-"));
  fs.cpSync(FIXTURE, root, { recursive: true });
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("init on plain-site", () => {
  it("runs the full pipeline", async () => {
    const code = await initCommand(root, {});
    expect(code).toBe(0);
  });

  it("tags safe elements and rewrites text to JSON refs", async () => {
    const index = fs.readFileSync(path.join(root, "src/pages/index.astro"), "utf8");
    expect(index).toContain('import home from "../data/home.json";');
    expect(index).toContain('data-cms-field="hero.heading"');
    expect(index).toContain("{home.hero.heading}");
    // eyebrow: short text before the heading
    expect(index).toContain('data-cms-field="hero.eyebrow"');
    // cta: label wrapped in span, href rewritten, anchor tagged for href editing
    expect(index).toContain('href={home.hero.cta.link}');
    expect(index).toContain('data-cms-field="hero.cta.label"');
    expect(index).toContain('data-cms-field="hero.cta.link"');
    // image: src + alt migrated, field on src
    expect(index).toContain('src={home.hero.image}');
    expect(index).toContain('alt={home.hero.imageAlt}');
    // section named from heading slug (no id on section 2)
    expect(index).toContain('data-cms-field="whyChooseUs.title"');
    // untouched: mixed markup, map over const, form chrome
    expect(index).toContain("<strong>2,000+</strong>");
    expect(index).toContain("{perks.map((perk) => <li>{perk}</li>)}");
    expect(index).toContain('placeholder="Your name"');
  });

  it("still parses as valid Astro", async () => {
    for (const page of ["index.astro", "about.astro"]) {
      const source = fs.readFileSync(path.join(root, "src/pages", page), "utf8");
      const { diagnosticCount } = await parseAstro(source);
      expect(diagnosticCount).toBe(0);
    }
  });

  it("writes JSON with seo first and extracted values", () => {
    const home = JSON.parse(
      fs.readFileSync(path.join(root, "src/data/home.json"), "utf8")
    );
    expect(Object.keys(home)[0]).toBe("seo");
    expect(home.seo.title).toBe("Acme Plumbing — Springfield");
    expect(home.hero.heading).toBe("Reliable plumbing, day or night");
    expect(home.hero.cta).toEqual({ label: "Get a quote", link: "/contact" });
    expect(home.hero.image).toBe("/media/hero.jpg");
    expect(home.hero.imageAlt).toBe("A plumber fixing a sink");
  });

  it("wires SEO props on the Layout", () => {
    const index = fs.readFileSync(path.join(root, "src/pages/index.astro"), "utf8");
    expect(index).toMatch(/<Layout title=\{home\.seo\.title\} description=\{home\.seo\.description\}>/);
    const about = fs.readFileSync(path.join(root, "src/pages/about.astro"), "utf8");
    expect(about).toContain("title={about.seo.title}");
  });

  it("creates .pages.yml with site first + entries + preview settings", () => {
    const yml = fs.readFileSync(path.join(root, ".pages.yml"), "utf8");
    expect(yml.indexOf("name: site")).toBeLessThan(yml.indexOf("name: home"));
    expect(yml).toContain("global:");
    expect(yml).toContain("home: /");
    expect(yml).toContain("about: /about");
    expect(yml).toContain("component: link");
  });

  it("adds the astro integration", () => {
    const config = fs.readFileSync(path.join(root, "astro.config.mjs"), "utf8");
    expect(config).toContain("@alisamadiillc/cms-bridge/astro");
    expect(config).toContain("cmsBridge()");
  });

  it("syncs the canonical pages-cms.md into the project", () => {
    const doc = path.join(root, "docs/pages-cms.md");
    expect(fs.existsSync(doc)).toBe(true);
    const content = fs.readFileSync(doc, "utf8");
    expect(content).toContain("cms-bridge:managed:start");
    expect(content).toContain("Site name in search results");
  });

  it("writes a self-contained report covering the skipped cases", () => {
    const report = fs.readFileSync(path.join(root, "cms-report.md"), "utf8");
    expect(report).toContain("## The CMS conventions contract");
    expect(report).toContain("R8"); // const perks = [...]
    expect(report).toContain("R2"); // mixed <p>…<strong>
    expect(report).toContain("R6"); // form chrome
    expect(report).toContain("R3"); // perks.map loop
  });

  it("second run is a byte-for-byte no-op", async () => {
    const before = snapshotTree(root);
    const code = await initCommand(root, {});
    expect(code).toBe(0);
    const after = snapshotTree(root);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [file, content] of after) {
      expect(content, file).toBe(before.get(file));
    }
  });
});

describe("collections on plain-site", () => {
  it("syncs a definition into .pages.yml and creates the dir", async () => {
    const defDir = path.join(root, "cms", "collections");
    fs.mkdirSync(defDir, { recursive: true });
    fs.writeFileSync(
      path.join(defDir, "testimonials.yml"),
      `label: Testimonials
fields:
  - { name: title, label: Title, type: string, required: true }
  - { name: quote, label: Quote, type: text }
`
    );
    fs.writeFileSync(
      path.join(defDir, "stories.yml"),
      `label: Stories
route: /stories/{slug}
fields:
  - { name: title, label: Title, type: string, required: true }
`
    );
    const code = await collectionsCommand(root, {});
    expect(code).toBe(0);
    const yml = fs.readFileSync(path.join(root, ".pages.yml"), "utf8");
    expect(yml).toContain("name: testimonials");
    expect(yml).toContain("type: collection");
    expect(yml).toContain("primary: title");
    expect(fs.existsSync(path.join(root, "src/data/testimonials/.gitkeep"))).toBe(true);
    // A collection with a dynamic route maps into settings.preview.paths, and
    // `route` never leaks into the entry body.
    expect(yml).toContain("stories: /stories/{slug}");
    expect(yml).not.toContain("route: /stories/{slug}");
  });

  it("re-sync is a no-op", async () => {
    const before = snapshotTree(root);
    await collectionsCommand(root, {});
    const after = snapshotTree(root);
    for (const [file, content] of after) {
      expect(content, file).toBe(before.get(file));
    }
  });
});

describe("init with a page/collection name clash", () => {
  it("gives the page its own file entry instead of merging into the collection", async () => {
    // A `blog` collection (dir src/data/blog/) …
    fs.writeFileSync(
      path.join(root, "cms", "collections", "blog.yml"),
      `label: Blog
route: /blog/{slug}
fields:
  - { name: title, label: Title, type: string, required: true }
  - { name: body, label: Body, type: rich-text }
`
    );
    expect(await collectionsCommand(root, {})).toBe(0);

    // … next to a `/blog` index page backed by src/data/blog.json (same name).
    fs.mkdirSync(path.join(root, "src/pages/blog"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "src/pages/blog/index.astro"),
      `---
import Layout from "../../layouts/Layout.astro";
import blog from "../../data/blog.json";
---
<Layout title="Blog" description="Posts">
  <h1>{blog.intro.heading}</h1>
</Layout>
`
    );
    fs.writeFileSync(
      path.join(root, "src/data/blog.json"),
      JSON.stringify({ intro: { heading: "The Blog" } }, null, 2)
    );

    expect(await initCommand(root, {})).toBe(0);

    const yml = fs.readFileSync(path.join(root, ".pages.yml"), "utf8");
    // The page got a distinct, non-colliding file entry mapped to /blog.
    expect(yml).toContain("name: blogPage");
    expect(yml).toContain("blogPage: /blog");
    // The collection is untouched — still a collection, no page fields merged.
    expect(yml).toContain("name: blog");
    expect(yml).not.toContain("name: intro");

    // The page's data import was repointed to the renamed entry's file.
    const page = fs.readFileSync(
      path.join(root, "src/pages/blog/index.astro"),
      "utf8"
    );
    expect(page).toContain('data/blogPage.json');

    const report = fs.readFileSync(path.join(root, "cms-report.md"), "utf8");
    expect(report).toContain("R11");
  });
});
