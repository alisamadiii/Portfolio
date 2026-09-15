import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { autoCmsVitePlugin } from "../src/auto/index.js";

const FIXTURE = path.join(__dirname, "fixtures", "plain-site");

const tmpDirs: string[] = [];
const mkProject = (layout: "legacy" | "combined"): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-bridge-auto-"));
  tmpDirs.push(dir);
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const manifest = {
    version: 1,
    baseUrl: "https://example.com",
    pages: { home: { route: "/" }, about: { route: "/about" } },
    collections: [],
  };
  if (layout === "legacy") {
    fs.mkdirSync(path.join(dir, "src/data"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "src/data/cms.json"),
      JSON.stringify(manifest, null, 2)
    );
    fs.writeFileSync(path.join(dir, "src/data/pages.json"), "{}\n");
  } else {
    fs.writeFileSync(
      path.join(dir, "_site.json"),
      JSON.stringify({ cms: manifest, seo: {}, variables: {} }, null, 2)
    );
    fs.writeFileSync(path.join(dir, "_pages.json"), "{}\n");
  }
  return dir;
};
afterEach(() => {
  while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

const silent = () => {};

type Plugin = ReturnType<typeof autoCmsVitePlugin>;

const transformFile = async (
  plugin: Plugin,
  root: string,
  rel: string
): Promise<string | null> => {
  const file = path.join(root, rel);
  const source = fs.readFileSync(file, "utf8");
  const result = await plugin.transform.handler(source, file);
  return result?.code ?? null;
};

const runAll = async (root: string): Promise<Record<string, string | null>> => {
  const plugin = autoCmsVitePlugin({ root, warn: silent });
  const out: Record<string, string | null> = {};
  for (const rel of ["src/pages/index.astro", "src/pages/about.astro"]) {
    out[rel] = await transformFile(plugin, root, rel);
  }
  plugin.closeBundle?.();
  return out;
};

const ID = "[a-z0-9]{4}";

describe("auto e2e (legacy layout, empty JSON → random IDs)", () => {
  it("wires the OUTPUT, leaves sources untouched, seeds flat keys", async () => {
    const root = mkProject("legacy");
    const sourceBefore = fs.readFileSync(
      path.join(root, "src/pages/index.astro"),
      "utf8"
    );
    const out = await runAll(root);

    const index = out["src/pages/index.astro"]!;
    expect(index).toMatch(new RegExp(`data-cms-field="heading_${ID}" data-cms-kind="text"`));
    expect(index).toMatch(new RegExp(`data-cms-field="cta_${ID}\\.link" data-cms-kind="link"`));
    expect(index).toContain('data-cms-kind="media"');
    // computed-local loop and form untouched
    expect(index).toContain("{perks.map((perk) => <li>{perk}</li>)}");
    expect(index).toContain('<input id="name" placeholder="Your name" />');

    // the SOURCE file is never modified — attrs live only in the output
    expect(
      fs.readFileSync(path.join(root, "src/pages/index.astro"), "utf8")
    ).toBe(sourceBefore);

    const pages = JSON.parse(
      fs.readFileSync(path.join(root, "src/data/pages.json"), "utf8")
    );
    const home = pages.home as Record<string, unknown>;
    const keyFor = (prefix: string, value: unknown) =>
      Object.entries(home).find(
        ([k, v]) => k.startsWith(prefix) && JSON.stringify(v) === JSON.stringify(value)
      )?.[0];
    expect(keyFor("heading_", "Reliable plumbing, day or night")).toBeDefined();
    expect(keyFor("cta_", { label: "Get a quote", link: "/contact" })).toBeDefined();
    const imageKey = keyFor("image_", "/media/hero.jpg");
    expect(imageKey).toBeDefined();
    expect(home[`${imageKey}Alt`]).toBe("A plumber fixing a sink");
    expect(keyFor("eyebrow_", "Springfield, IL")).toBeDefined();
    expect(pages.about).toBeDefined();
  });

  it("is idempotent: second run binds by value — JSON byte-identical, same keys", async () => {
    const root = mkProject("legacy");
    const first = await runAll(root);
    const jsonFile = path.join(root, "src/data/pages.json");
    const jsonBefore = fs.readFileSync(jsonFile, "utf8");
    const second = await runAll(root);
    expect(fs.readFileSync(jsonFile, "utf8")).toBe(jsonBefore);
    // identical wiring, run to run — value binding regenerates the same keys
    expect(second["src/pages/index.astro"]).toBe(first["src/pages/index.astro"]);
  });

  it("JSON wins: an edited seeded value substitutes into the output", async () => {
    const root = mkProject("legacy");
    await runAll(root);
    const file = path.join(root, "src/data/pages.json");
    const pages = JSON.parse(fs.readFileSync(file, "utf8"));
    const headingKey = Object.keys(pages.home).find((k) => k.startsWith("heading_"))!;
    pages.home[headingKey] = "Plumbing, perfected";
    fs.writeFileSync(file, JSON.stringify(pages, null, 2) + "\n");

    const out = await runAll(root);
    expect(out["src/pages/index.astro"]).toContain('{"Plumbing, perfected"}');
    // JSON untouched by the re-run
    expect(JSON.parse(fs.readFileSync(file, "utf8")).home[headingKey]).toBe(
      "Plumbing, perfected"
    );
  });

  it("skips non-page files, dynamic routes, and query sub-requests", async () => {
    const root = mkProject("legacy");
    const plugin = autoCmsVitePlugin({ root, warn: silent });
    const layout = path.join(root, "src/layouts/Layout.astro");
    const source = fs.readFileSync(layout, "utf8");
    expect(await plugin.transform.handler(source, layout)).toBeNull();
    expect(
      await plugin.transform.handler("<p>x</p>", path.join(root, "src/pages/[slug].astro"))
    ).toBeNull();
    expect(
      await plugin.transform.handler(
        "css",
        path.join(root, "src/pages/index.astro") + "?astro&type=style"
      )
    ).toBeNull();
  });
});

describe("auto e2e (legacy adoption)", () => {
  it("reuses readable keys already present in the JSON instead of minting", async () => {
    const root = mkProject("legacy");
    // JSON as an existing repo would have it — derived from #hero section
    fs.writeFileSync(
      path.join(root, "src/data/pages.json"),
      JSON.stringify(
        {
          home: {
            hero: {
              eyebrow: "Springfield, IL",
              heading: "Reliable plumbing, day or night",
              text: "Family-owned and operating since 1998. We fix leaks, unclog drains, and install water heaters across the metro area.",
              cta: { label: "Get a quote", link: "/contact" },
              image: "/media/hero.jpg",
              imageAlt: "A plumber fixing a sink",
            },
          },
        },
        null,
        2
      ) + "\n"
    );
    const jsonFile = path.join(root, "src/data/pages.json");
    const before = fs.readFileSync(jsonFile, "utf8");
    const out = await runAll(root);
    // readable keys reused in the OUTPUT wiring — never a rename
    const index = out["src/pages/index.astro"]!;
    expect(index).toContain('data-cms-field="hero.heading"');
    expect(index).toContain('data-cms-field="hero.cta.link"');
    expect(index).toContain('data-cms-field="hero.eyebrow"');
    // existing JSON keys unchanged (whyChooseUs section wasn't in JSON → minted)
    const pages = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
    expect(pages.home.hero.heading).toBe("Reliable plumbing, day or night");
    expect(index).toMatch(new RegExp(`data-cms-field="title_${ID}"`));
    expect(before).not.toBe(fs.readFileSync(jsonFile, "utf8")); // minted keys seeded
  });
});

describe("auto e2e (combined root layout)", () => {
  it("seeds root _pages.json", async () => {
    const root = mkProject("combined");
    const out = await runAll(root);
    expect(out["src/pages/index.astro"]).toMatch(
      new RegExp(`data-cms-field="heading_${ID}"`)
    );
    const pages = JSON.parse(
      fs.readFileSync(path.join(root, "_pages.json"), "utf8")
    );
    expect(
      Object.values(pages.home).includes("Reliable plumbing, day or night")
    ).toBe(true);
    // legacy location untouched
    expect(fs.existsSync(path.join(root, "src/data/pages.json"))).toBe(false);
  });
});

describe("seed store concurrency", () => {
  it("parallel transforms produce one coherent file with no lost additions", async () => {
    const root = mkProject("legacy");
    const plugin = autoCmsVitePlugin({ root, warn: silent });
    await Promise.all(
      ["src/pages/index.astro", "src/pages/about.astro"].map((rel) =>
        transformFile(plugin, root, rel)
      )
    );
    plugin.closeBundle?.();
    const pages = JSON.parse(
      fs.readFileSync(path.join(root, "src/data/pages.json"), "utf8")
    );
    expect(Object.keys(pages.home ?? {}).length).toBeGreaterThan(0);
    expect(pages.about).toBeDefined();
  });
});

describe("flat contract — self-heal + orphan prune (heavy-test finds)", () => {
  const mkFlat = (pagesRaw: string): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-heal-"));
    tmpDirs.push(dir);
    fs.mkdirSync(path.join(dir, "src/pages"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "_site.json"),
      JSON.stringify({ cms: { version: 2, baseUrl: "https://x.com", pages: { home: { route: "/" } } }, seo: {}, variables: {} })
    );
    fs.writeFileSync(path.join(dir, "_pages.json"), pagesRaw);
    fs.writeFileSync(path.join(dir, "src/pages/index.astro"), "<section><h1>Hello world</h1></section>\n");
    return dir;
  };
  const buildOnce = async (dir: string) => {
    const plugin = autoCmsVitePlugin({ root: dir, warn: silent });
    const f = path.join(dir, "src/pages/index.astro");
    await plugin.transform.handler.call(undefined, fs.readFileSync(f, "utf8"), f);
    plugin.closeBundle?.();
  };

  it("heals empty/invalid/non-object pages JSON and reseeds", async () => {
    for (const bad of ["", "not json {{", "[]", '"str"', "null", "42"]) {
      const dir = mkFlat(bad);
      await buildOnce(dir);
      const p = JSON.parse(fs.readFileSync(path.join(dir, "_pages.json"), "utf8"));
      expect(Array.isArray(p)).toBe(false);
      expect(Object.keys(p).some((k) => k.startsWith("heading_"))).toBe(true);
    }
  });

  it("prunes orphan auto-ID scalars on a full build, keeps arrays + bound keys", async () => {
    const dir = mkFlat(JSON.stringify({
      text_dead: "orphan duplicate",
      image_deadAlt: "orphan alt",
      custom_thing: "not auto-ID — kept",
      list_ab12: [{ x: 1 }],
    }));
    await buildOnce(dir);
    const p = JSON.parse(fs.readFileSync(path.join(dir, "_pages.json"), "utf8"));
    expect(p.text_dead).toBeUndefined();
    expect(p.image_deadAlt).toBeUndefined();
    expect(p.custom_thing).toBe("not auto-ID — kept");
    expect(p.list_ab12).toEqual([{ x: 1 }]);
    expect(Object.keys(p).some((k) => k.startsWith("heading_"))).toBe(true);
  });
});
