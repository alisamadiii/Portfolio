/**
 * End-to-end: `cms-bridge blog new "Title"` scaffolds a hub-contract post
 * template and refuses to overwrite an existing file without --force.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { blogNewCommand } from "../src/cli/commands/blog.js";

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "cms-bridge-blog-new-"));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const POST = path.join("src", "content", "blog", "hello-world.md");

describe("blog new", () => {
  it("scaffolds a post template with hub-contract frontmatter", () => {
    expect(blogNewCommand(root, "Hello, World!")).toBe(0);

    const content = fs.readFileSync(path.join(root, POST), "utf8");
    expect(content).toContain('title: "Hello, World!"');
    expect(content).toContain('description: ""');
    expect(content).toMatch(/publishDate: \d{4}-\d{2}-\d{2}/);
    expect(content).toContain('coverImage: ""');
    expect(content).toContain('coverImageAlt: ""');
    expect(content).toContain("tags: []");
    expect(content.startsWith("---\n")).toBe(true);
  });

  it("refuses to overwrite without --force, overwrites with it", () => {
    expect(blogNewCommand(root, "Hello, World!")).toBe(0);
    fs.writeFileSync(path.join(root, POST), "edited");

    expect(blogNewCommand(root, "Hello, World!")).toBe(1);
    expect(fs.readFileSync(path.join(root, POST), "utf8")).toBe("edited");

    expect(blogNewCommand(root, "Hello, World!", { force: true })).toBe(0);
    expect(fs.readFileSync(path.join(root, POST), "utf8")).toContain(
      'title: "Hello, World!"'
    );
  });

  it("rejects an empty or unslugifiable title", () => {
    expect(blogNewCommand(root, "   ")).toBe(1);
    expect(blogNewCommand(root, "!!!")).toBe(1);
  });
});
