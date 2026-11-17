import { describe, expect, it } from "vitest";

import { buildTree, defaultFile, langForPath, parentFolders, type TreeEntry } from "./source-tree";

const blob = (path: string): TreeEntry => ({ path, type: "blob", sha: path, size: 1 });
const tree = (path: string): TreeEntry => ({ path, type: "tree", sha: path, size: null });

describe("buildTree", () => {
  it("sorts folders before files, then alphabetically", () => {
    const nodes = buildTree([blob("z.ts"), blob("a.ts"), tree("src"), blob("src/x.ts"), tree("public")]);
    expect(nodes.map((n) => n.name)).toEqual(["public", "src", "a.ts", "z.ts"]);
  });

  it("nests deep paths under their folders", () => {
    const nodes = buildTree([tree("src"), tree("src/pages"), blob("src/pages/index.astro"), blob("src/env.d.ts")]);
    expect(nodes).toHaveLength(1);
    const src = nodes[0]!;
    expect(src.children.map((n) => n.path)).toEqual(["src/pages", "src/env.d.ts"]);
    expect(src.children[0]!.children[0]).toMatchObject({ path: "src/pages/index.astro", type: "file", sha: "src/pages/index.astro" });
  });

  it("creates parent folders missing from the entries (truncated trees)", () => {
    const nodes = buildTree([blob("a/b/c.css")]);
    expect(nodes[0]).toMatchObject({ path: "a", type: "folder" });
    expect(nodes[0]!.children[0]).toMatchObject({ path: "a/b", type: "folder" });
  });
});

describe("langForPath", () => {
  it("maps common web extensions", () => {
    expect(langForPath("src/pages/index.astro")).toBe("astro");
    expect(langForPath("app/page.tsx")).toBe("tsx");
    expect(langForPath("styles/global.css")).toBe("css");
    expect(langForPath("public/logo.svg")).toBe("xml");
  });

  it("maps special file names", () => {
    expect(langForPath("Dockerfile")).toBe("docker");
    expect(langForPath(".env")).toBe("dotenv");
    expect(langForPath(".env.production")).toBe("dotenv");
    expect(langForPath(".gitignore")).toBe("ini");
  });

  it("falls back to text for unknown or extensionless files", () => {
    expect(langForPath("LICENSE")).toBe("text");
    expect(langForPath("data.weird")).toBe("text");
  });
});

describe("defaultFile", () => {
  it("prefers the root README.md", () => {
    expect(defaultFile([blob("a.ts"), blob("package.json"), blob("README.md")])?.path).toBe("README.md");
  });

  it("falls back to package.json, then the first file", () => {
    expect(defaultFile([blob("a.ts"), blob("package.json")])?.path).toBe("package.json");
    expect(defaultFile([tree("src"), blob("src/a.ts")])?.path).toBe("src/a.ts");
    expect(defaultFile([])).toBeNull();
  });
});

describe("parentFolders", () => {
  it("lists every ancestor folder", () => {
    expect(parentFolders("a/b/c.ts")).toEqual(["a", "a/b"]);
    expect(parentFolders("c.ts")).toEqual([]);
  });
});
