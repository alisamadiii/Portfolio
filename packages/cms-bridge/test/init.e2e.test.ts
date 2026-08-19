/**
 * End-to-end: run the real init pipeline against the plain-site fixture in a
 * temp dir. Covers the three-file scaffold, the skill install, the idempotency
 * + add-only contract, and the interactive `collection` command.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initCommand } from "../src/cli/commands/init.js";
import { checkContract } from "../src/cli/commands/check.js";
import { collectionCommand } from "../src/cli/commands/collection.js";

const FIXTURE = path.join(__dirname, "fixtures", "plain-site");

let root: string;

const read = (rel: string): string => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel: string): any => JSON.parse(read(rel));

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

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "cms-bridge-e2e-"));
  fs.cpSync(FIXTURE, root, { recursive: true });
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("init on plain-site", () => {
  it("runs and scaffolds the contract files + skill", async () => {
    expect(await initCommand(root, {})).toBe(0);
    expect(fs.existsSync(path.join(root, "src/data/cms.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/data/pages.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/data/variables.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/data/seo.json"))).toBe(true);
    expect(
      fs.existsSync(path.join(root, ".claude/skills/cms-bridge/SKILL.md"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, ".claude/skills/cms-bridge/pages-cms.md"))
    ).toBe(true);
  });

  it("migrates a legacy site.json into variables.json (seeded from its content)", async () => {
    fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "src/data/site.json"),
      JSON.stringify({ name: "Acme Co", phone: "+1 555 0100" }, null, 2)
    );
    expect(await initCommand(root, {})).toBe(0);
    expect(fs.existsSync(path.join(root, "src/data/variables.json"))).toBe(true);
    const variables = readJson("src/data/variables.json");
    expect(variables.name).toBe("Acme Co");
    expect(variables.phone).toBe("+1 555 0100");
  });

  it("scaffolds a page object per manifest page in pages.json", async () => {
    await initCommand(root, {});
    const pages = readJson("src/data/pages.json");
    expect(pages.home).toEqual({});
    // Leaves the source markup untouched — wiring happens in the canvas.
    const index = read("src/pages/index.astro");
    expect(index).not.toContain("field=");
  });

  it("second run is byte-identical (idempotent)", async () => {
    await initCommand(root, {});
    const before = snapshotTree(root);
    await initCommand(root, {});
    const after = snapshotTree(root);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [file, content] of before) expect(after.get(file)).toBe(content);
  });

  it("preserves hand-added pages.json data across re-runs (add-only)", async () => {
    await initCommand(root, {});
    const pagesFile = path.join(root, "src/data/pages.json");
    const j = JSON.parse(fs.readFileSync(pagesFile, "utf8"));
    j.home = { hero: { customNote: "KEEP ME" } };
    j.brandNew = { seo: { title: "X", description: "Y" } };
    fs.writeFileSync(pagesFile, `${JSON.stringify(j, null, 2)}\n`);
    await initCommand(root, {});
    const after = JSON.parse(fs.readFileSync(pagesFile, "utf8"));
    expect(after.home.hero.customNote).toBe("KEEP ME");
    expect(after.brandNew).toEqual({ seo: { title: "X", description: "Y" } });
  });
});

describe("collection command", () => {
  const drive = (answers: string[]) =>
    collectionCommand(root, {
      input: Readable.from(answers.map((a) => `${a}\n`)),
      output: new (require("node:stream").Writable)({ write(_c: any, _e: any, cb: any) { cb(); } }),
    });

  it("requires init first", async () => {
    expect(await drive(["team"])).toBe(1); // no cms.json yet
  });

  it("creates a collection file + cms.json entry, and refuses duplicates", async () => {
    await initCommand(root, {});
    const code = await drive(["team", "", "name", "string", "y", "role", "string", "", ""]);
    expect(code).toBe(0);
    const file = readJson("src/data/collections/team.json");
    expect(file).toEqual([{ name: "", role: "" }]);
    const collection = readJson("src/data/cms.json").collections.find(
      (c: any) => c.name === "team"
    );
    expect(collection.path).toBe("src/data/collections/team.json");
    expect(collection.fields).toHaveLength(2);
    expect(collection.fields[0].required).toBe(true);
    // Duplicate name aborts.
    expect(await drive(["team"])).toBe(1);
  });
});

describe("check", () => {
  it("passes the contract once baseUrl is set", async () => {
    await initCommand(root, {});
    const cmsFile = path.join(root, "src/data/cms.json");
    const j = JSON.parse(fs.readFileSync(cmsFile, "utf8"));
    j.baseUrl = "https://example.com";
    fs.writeFileSync(cmsFile, `${JSON.stringify(j, null, 2)}\n`);
    const { errors } = checkContract(root);
    expect(errors).toEqual([]);
  });
});
