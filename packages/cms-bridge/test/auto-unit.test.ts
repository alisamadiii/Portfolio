import { describe, expect, it } from "vitest";

import { assignPaths } from "../src/cli/core/naming.js";
import {
  addAtPath,
  canAddPath,
  flattenPaths,
} from "../src/cli/core/json-store.js";
import { AUTO_ID_RE, mintFieldId, pathFromFieldAttr } from "../src/auto/ids.js";
import { autoTransformPage } from "../src/auto/transform.js";
import type { CandidateField } from "../src/cli/types.js";

const silent = () => {};

/** Deterministic 4-char base36 suffixes: aaaa, aaab, aaac, … */
const seqRng = () => {
  let n = 0;
  return () => {
    const s = n++;
    return (
      "a" +
      String.fromCharCode(97 + Math.floor(s / 676)) +
      String.fromCharCode(97 + (Math.floor(s / 26) % 26)) +
      String.fromCharCode(97 + (s % 26))
    );
  };
};

const run = (source: string, pageJson: Record<string, unknown> = {}) =>
  autoTransformPage(source, {
    relPath: "src/pages/index.astro",
    pageKey: "home",
    pageJson,
    warn: silent,
    rng: seqRng(),
  });

const HERO = `---
import Layout from "../layouts/Layout.astro";
---

<Layout>
  <main>
    <section>
      <h1>Get in touch</h1>
      <p>Have a question or a project in mind?</p>
      <p>We reply within a day.</p>
      <a href="/contact">Contact us</a>
      <img src="/media/hero.png" alt="Team photo" />
    </section>
  </main>
</Layout>
`;

/** Seed a JSON object from a run's additions. */
const seedFrom = (additions: Array<{ path: string; value: unknown }>) => {
  const seeded: Record<string, unknown> = {};
  for (const { path, value } of additions) addAtPath(seeded, path, value);
  return seeded;
};

// ---------------------------------------------------------------------------
// ids
// ---------------------------------------------------------------------------

describe("ids", () => {
  it("mints role-prefixed base36 IDs and reserves compound siblings", () => {
    const taken = new Set<string>();
    const rng = seqRng();
    const image = mintFieldId("image", taken, rng);
    const cta = mintFieldId("cta", taken, rng);
    expect(image).toMatch(AUTO_ID_RE);
    expect(taken.has(`${image}Alt`)).toBe(true);
    expect(taken.has(`${cta}.label`)).toBe(true);
    expect(taken.has(`${cta}.link`)).toBe(true);
  });

  it("re-rolls on collision", () => {
    const suffixes = ["aaaa", "aaaa", "bbbb"];
    let i = 0;
    const rng = () => suffixes[i++];
    const taken = new Set<string>(["text_aaaa"]);
    expect(mintFieldId("text", taken, rng)).toBe("text_bbbb");
  });

  it("pathFromFieldAttr strips the cta .link leaf only", () => {
    expect(pathFromFieldAttr("cta_r7t3.link", "cta")).toBe("cta_r7t3");
    expect(pathFromFieldAttr("hero.cta.link", "cta")).toBe("hero.cta");
    expect(pathFromFieldAttr("text_x8n1", "text")).toBe("text_x8n1");
  });
});

// ---------------------------------------------------------------------------
// Restored helpers (legacy-adoption path still exercises these)
// ---------------------------------------------------------------------------

describe("assignPaths (legacy-adoption keys)", () => {
  const make = (): CandidateField => ({
    role: "text",
    tag: "p",
    sectionChain: ["hero"],
    line: 1,
    el: { start: 0, name: "p" },
  });
  it("numbers collisions against taken", () => {
    const a = make();
    const b = make();
    assignPaths([a, b], new Set(["hero.text3"]));
    expect(a.path).toBe("hero.text");
    expect(b.path).toBe("hero.text2");
  });
  it("image reserves its Alt sibling", () => {
    const image: CandidateField = {
      role: "image",
      tag: "img",
      sectionChain: ["hero"],
      line: 1,
      el: { start: 0, name: "img" },
    };
    const taken = new Set<string>();
    assignPaths([image], taken);
    expect(image.path).toBe("hero.image");
    expect(taken.has("hero.imageAlt")).toBe(true);
  });
});

describe("json-store add-only helpers (restored)", () => {
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
  it("flattens all levels", () => {
    expect(flattenPaths({ a: { b: "x" } })).toEqual(["a", "a.b"]);
  });
});

// ---------------------------------------------------------------------------
// Auto transform — output wiring + seeding (source is NEVER modified)
// ---------------------------------------------------------------------------

describe("autoTransformPage — wiring + seeding", () => {
  it("wires fresh random IDs into the OUTPUT and seeds flat additions", async () => {
    const result = await run(HERO);
    expect(result).not.toBeNull();
    const { code, additions } = result!;
    expect(code).toContain('<h1 data-cms-field="heading_aaaa" data-cms-kind="text">');
    expect(code).toContain('data-cms-field="text_aaab"');
    expect(code).toContain('data-cms-field="text_aaac"');
    expect(code).toContain('data-cms-field="cta_aaad.link" data-cms-kind="link"');
    // self-closing img: attrs land BEFORE the slash
    expect(code).toMatch(
      /<img src="\/media\/hero\.png" alt="Team photo" data-cms-field="image_aaae" data-cms-kind="media" \/>/
    );
    const byPath = Object.fromEntries(additions.map((a) => [a.path, a.value]));
    expect(byPath["heading_aaaa"]).toBe("Get in touch");
    expect(byPath["cta_aaad"]).toEqual({ label: "Contact us", link: "/contact" });
    expect(byPath["image_aaae"]).toBe("/media/hero.png");
    expect(byPath["image_aaaeAlt"]).toBe("Team photo");
  });

  it("binds by VALUE on later runs: same keys, zero additions, no minting", async () => {
    const first = await run(HERO);
    const seeded = seedFrom(first!.additions);
    const second = await run(HERO, seeded); // fresh rng — must not be used
    expect(second).not.toBeNull();
    expect(second!.autoPaths).toEqual(first!.autoPaths);
    expect(second!.additions).toEqual([]);
    expect(second!.code).toContain('data-cms-field="heading_aaaa"');
  });

  it("REORDER-SAFE: keys follow their content when elements move", async () => {
    const first = await run(HERO);
    const seeded = seedFrom(first!.additions);
    // swap the two paragraphs
    const reordered = HERO.replace(
      "<p>Have a question or a project in mind?</p>\n      <p>We reply within a day.</p>",
      "<p>We reply within a day.</p>\n      <p>Have a question or a project in mind?</p>"
    );
    const second = await run(reordered, seeded);
    expect(second!.additions).toEqual([]); // nothing re-minted
    // each literal keeps ITS key
    expect(second!.code).toContain(
      '<p data-cms-field="text_aaac" data-cms-kind="text">We reply within a day.</p>'
    );
    expect(second!.code).toContain(
      '<p data-cms-field="text_aaab" data-cms-kind="text">Have a question or a project in mind?</p>'
    );
  });

  it("literal EDIT binds by ordinal: same key kept, JSON wins in output", async () => {
    const first = await run(HERO);
    const seeded = seedFrom(first!.additions);
    const edited = HERO.replace("Get in touch", "Say hello instead");
    const second = await run(edited, seeded);
    expect(second!.additions).toEqual([]);
    // bound to the ORIGINAL heading key; JSON value substitutes
    expect(second!.code).toContain(
      '<h1 data-cms-field="heading_aaaa" data-cms-kind="text">{"Get in touch"}</h1>'
    );
  });

  it("deleted JSON key: element re-seeds under a fresh ID", async () => {
    const first = await run(HERO);
    const seeded = seedFrom(first!.additions);
    delete seeded["heading_aaaa"];
    const second = await run(HERO, seeded);
    const reseeded = second!.additions.find((a) => a.value === "Get in touch");
    expect(reseeded).toBeDefined();
    expect(reseeded!.path).toMatch(/^heading_[a-z0-9]{4}$/);
  });

  it("legacy adoption: readable keys already in JSON are reused, not renamed", async () => {
    const pageJson = {
      getInTouch: {
        heading: "Get in touch",
        text: "Have a question or a project in mind?",
        text2: "We reply within a day.",
        cta: { label: "Contact us", link: "/contact" },
        image: "/media/hero.png",
        imageAlt: "Team photo",
      },
    };
    const result = await run(HERO, pageJson);
    expect(result).not.toBeNull();
    const { additions, code, autoPaths } = result!;
    expect(additions).toEqual([]);
    expect(code).toContain('data-cms-field="getInTouch.heading"');
    expect(code).toContain('data-cms-field="getInTouch.cta.link"');
    expect(autoPaths).not.toContain("heading_aaaa");
  });

  it("JSON wins: substitutes edited values into text, img, and cta", async () => {
    const first = await run(HERO);
    const seeded = seedFrom(first!.additions);
    seeded["heading_aaaa"] = "Say hello";
    seeded["image_aaae"] = "/media/new.png";
    seeded["image_aaaeAlt"] = "New photo";
    seeded["cta_aaad"] = { label: "Reach out", link: "/reach" };

    const result = await run(HERO, seeded);
    const { code, additions } = result!;
    expect(additions).toEqual([]);
    expect(code).toContain(
      '<h1 data-cms-field="heading_aaaa" data-cms-kind="text">{"Say hello"}</h1>'
    );
    expect(code).toContain('src={"/media/new.png"}');
    expect(code).toContain('alt={"New photo"}');
    expect(code).toContain('href={"/reach"}');
    expect(code).toContain('{"Reach out"}');
    // unchanged values keep their literal markup
    expect(code).toContain(">Have a question or a project in mind?<");
  });

  it("values with quotes/braces/angle brackets render via safe expressions", async () => {
    const first = await run(HERO);
    const seeded = seedFrom(first!.additions);
    seeded["heading_aaaa"] = 'He said "hi" & {cost} < 5';
    const result = await run(HERO, seeded);
    expect(result!.code).toContain(`{"He said \\"hi\\" & {cost} < 5"}`);
  });

  it("rich-marker values use Fragment set:html + inject the renderRich import once", async () => {
    const first = await run(HERO);
    const seeded = seedFrom(first!.additions);
    seeded["heading_aaaa"] = "Make it **bold**";
    seeded["text_aaab"] = "And `accent` this";
    const result = await run(HERO, seeded);
    const { code } = result!;
    expect(code).toContain('<Fragment set:html={renderRich("Make it **bold**")} />');
    expect(code).toContain('<Fragment set:html={renderRich("And `accent` this")} />');
    const importCount = (code.match(/from "@alisamadiillc\/cms-bridge\/rich"/g) ?? []).length;
    expect(importCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Boundaries
// ---------------------------------------------------------------------------

describe("autoTransformPage — boundaries", () => {
  it("manual data-cms-field self-pins: no rename, no double attr, seeded + substituted", async () => {
    const source = `<section>
  <p data-cms-field="hero.text">Wired by hand</p>
  <p>Plain sibling</p>
</section>
`;
    const result = await run(source);
    expect(result).not.toBeNull();
    // manual element untouched — attr NOT injected twice
    expect(result!.code).toContain('<p data-cms-field="hero.text">Wired by hand</p>');
    expect(result!.autoPaths).toContain("hero.text");
    const byPath = Object.fromEntries(result!.additions.map((a) => [a.path, a.value]));
    expect(byPath["hero.text"]).toBe("Wired by hand");
    // sibling minted a random ID
    expect(result!.autoPaths.some((p) => /^text_[a-z0-9]{4}$/.test(p))).toBe(true);
    // manual substitution applies when JSON diverges
    const edited = await run(source, { hero: { text: "From CMS" } });
    expect(edited!.code).toContain('{"From CMS"}');
  });

  it("skips non-page expressions, components with field, and form chrome", async () => {
    const source = `---
const items = ["a"];
---

<section>
  <h2>Features</h2>
  {items.map((item) => (
    <p>{item}</p>
  ))}
  <form>
    <label>Name</label>
    <button type="submit">Send</button>
  </form>
</section>
`;
    const result = await run(source);
    expect(result).not.toBeNull();
    const { code, additions } = result!;
    expect(code).toContain('<h2 data-cms-field="title_aaaa" data-cms-kind="text">');
    expect(code).toContain("<p>{item}</p>");
    expect(code).toContain("<label>Name</label>");
    expect(code).toContain('<button type="submit">Send</button>');
    expect(additions.map((a) => a.path)).toEqual(["title_aaaa"]);
  });

  it("handles non-ASCII before the target (byte-offset canary)", async () => {
    const source = `<section>
  <p>© Acme — every builder’s café</p>
  <h2>Title</h2>
</section>
`;
    const result = await run(source);
    expect(result).not.toBeNull();
    expect(result!.code).toMatch(
      /<h2 data-cms-field="title_[a-z0-9]{4}" data-cms-kind="text">Title<\/h2>/
    );
    expect(result!.code).toContain("© Acme — every builder’s café</p>");
  });

  it("returns null for pages with nothing to do", async () => {
    expect(await run("<div>{}</div>\n")).toBeNull();
    expect(await run("<section><p>Hi</p>")).not.toBeNull(); // recoverable is fine if it parses
  });

  it("output always reparses (attrs land inside complex open tags)", async () => {
    const source = `<section>
  <h2 class={cond ? "a" : "b"} data-x={a > b}>Static heading</h2>
</section>
`;
    const result = await run(source);
    expect(result).not.toBeNull();
    expect(result!.code).toMatch(/data-cms-field="title_[a-z0-9]{4}"/);
  });
});

// ---------------------------------------------------------------------------
// Loop auto-wiring (output-only; source untouched)
// ---------------------------------------------------------------------------

const LOOP_PAGE = `---
import pages from "_pages.json";

const home = pages.home;
---

<main>
  <div>
    <div class="grid">
      {
        home.features.map((feature) => (
          <div class="card">
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
            <a href={feature.link}>More</a>
          </div>
        ))
      }
    </div>
  </div>
</main>
`;

describe("autoTransformPage — loops", () => {
  it("wires a plain map to the Group/Item DOM contract in the OUTPUT", async () => {
    const pageJson = { features: [{ title: "T", text: "X", link: "/x" }] };
    const result = await run(LOOP_PAGE, pageJson);
    expect(result).not.toBeNull();
    const { code } = result!;
    expect(code).toContain(
      '<div class="grid" data-cms-field="features" data-cms-kind="group">'
    );
    // index param injected in-memory
    expect(code).toContain("home.features.map((feature, i) => (");
    expect(code).toContain('<div class="card" data-cms-item={i}>');
    expect(code).toContain(
      "<h2 data-cms-field={`features.${i}.title`} data-cms-kind=\"text\">{feature.title}</h2>"
    );
    expect(code).toContain(
      "<a href={feature.link} data-cms-field={`features.${i}.link`} data-cms-kind=\"link\">More</a>"
    );
    expect(result!.additions).toEqual([]);
    expect(result!.autoPaths).toContain("features");
  });

  it("keeps an existing index param", async () => {
    const source = LOOP_PAGE.replace("(feature) =>", "(feature, n) =>");
    const pageJson = { features: [{ title: "T", text: "X", link: "/x" }] };
    const result = await run(source, pageJson);
    expect(result!.code).toContain("data-cms-item={n}");
    expect(result!.code).toContain("`features.${n}.title`");
  });

  it("bootstraps a missing array with one placeholder item from accessors", async () => {
    const result = await run(LOOP_PAGE, {});
    const byPath = Object.fromEntries(result!.additions.map((a) => [a.path, a.value]));
    expect(byPath["features"]).toEqual([
      { title: "Title", text: "Text", link: "#" },
    ]);
  });

  it("skips a map whose page-JSON value is not an array", async () => {
    const result = await run(LOOP_PAGE, { features: "oops" });
    expect(result?.code ?? "").not.toContain('data-cms-kind="group"');
  });
});

// ---------------------------------------------------------------------------
// Flat contract (cms.version 2)
// ---------------------------------------------------------------------------

const runFlat = (
  source: string,
  pageJson: Record<string, unknown> = {},
  externalClaims?: Set<string>
) =>
  autoTransformPage(source, {
    relPath: "src/components/Newsletter.astro",
    pageKey: "",
    pageJson,
    warn: silent,
    rng: seqRng(),
    flat: true,
    externalClaims,
  });

describe("flat contract", () => {
  it("wires chrome: buttons, labels, footer text become editable", async () => {
    const source = `<footer>
  <p>© Acme Studio. All rights reserved.</p>
</footer>
<form>
  <label for="n">Name</label>
  <button type="submit">Send message</button>
</form>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const { code, additions } = result!;
    expect(code).toMatch(/<p data-cms-field="text_[a-z0-9]{4}" data-cms-kind="text">© Acme Studio/);
    expect(code).toMatch(/<label for="n" data-cms-field="text_[a-z0-9]{4}"[^>]*>Name<\/label>/);
    expect(code).toMatch(/<button type="submit" data-cms-field="text_[a-z0-9]{4}"[^>]*>Send message<\/button>/);
    expect(additions.map((a) => a.value)).toContain("Send message");
  });

  it("externalClaims: identical literal in another file mints a separate key", async () => {
    const source = `<section><p>Get in touch</p></section>\n`;
    const seeded = { text_zzzz: "Get in touch" }; // owned by ANOTHER file
    const result = await runFlat(source, seeded, new Set(["text_zzzz"]));
    expect(result).not.toBeNull();
    const minted = result!.additions.find((a) => a.value === "Get in touch");
    expect(minted).toBeDefined();
    expect(minted!.path).not.toBe("text_zzzz");
  });

  it("marks variable-bound elements with data-cms-variant (not editable, not seeded)", async () => {
    const source = `---
import siteData from "_site.json";

const variables = siteData.variables;
---

<footer>
  <p>{siteData.variables.name}</p>
  <a href={\`mailto:\${variables.email}\`}>{variables.email}</a>
  <span>{variables.socials.facebook}</span>
</footer>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const { code, additions } = result!;
    expect(code).toContain('<p data-cms-variant="name">');
    expect(code).toMatch(/<a href=\{`mailto:\$\{variables\.email\}`\} data-cms-variant="email">/);
    expect(code).toContain('<span data-cms-variant="socials.facebook">');
    expect(additions).toEqual([]); // variables are never seeded
  });

  it("loops: mints a random array key and rewrites the accessor in the OUTPUT", async () => {
    const source = `---
import pages from "_pages.json";
---

<main>
  <div>
    <div class="grid">
      {
        pages.features.map((feature) => (
          <div><h2>{feature.title}</h2></div>
        ))
      }
    </div>
  </div>
</main>
`;
    const first = await runFlat(source);
    expect(first).not.toBeNull();
    const boot = first!.additions.find((a) => /^features_[a-z0-9]{4}$/.test(a.path));
    expect(boot).toBeDefined();
    expect(boot!.value).toEqual([{ title: "Title" }]);
    const key = boot!.path;
    expect(first!.code).toContain(`(pages["${key}"] ?? []).map((feature, i) => (`);
    expect(first!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(first!.code).toContain("data-cms-field={`" + key + ".${i}.title`}");

    // rediscovery: seeded JSON → same key, no new additions
    const second = await runFlat(source, { [key]: [{ title: "Real" }] });
    expect(second!.additions).toEqual([]);
    expect(second!.code).toContain(`(pages["${key}"] ?? []).map`);
  });

  it("loops: frontmatter-bound accessor is rewritten in the frontmatter RHS", async () => {
    const source = `---
import pages from "_pages.json";

const feats = pages.features;
---

<div>
  <div class="grid">
    {feats.map((f) => (
      <div><h2>{f.title}</h2></div>
    ))}
  </div>
</div>
`;
    const result = await runFlat(source, { features_ab12: [{ title: "T" }] });
    expect(result).not.toBeNull();
    expect(result!.code).toContain('const feats = (pages["features_ab12"] ?? []);');
    expect(result!.code).toContain('data-cms-field="features_ab12" data-cms-kind="group"');
  });
});

describe("flat contract — hub-edit cold rebind (persisted ownership)", () => {
  it("a value edited in JSON rebinds via ownClaims and substitutes — no new key", async () => {
    const source = `<section><h1>Old headline</h1><p>Body text.</p></section>\n`;
    const first = await runFlat(source);
    const seeded = seedFrom(first!.additions);
    const headingKey = first!.autoPaths.find((p) => p.startsWith("heading_"))!;
    // hub edits the value between dev sessions
    seeded[headingKey] = "New headline from the hub";
    // cold build, but ownership persisted (_fields.json → ownClaims)
    const second = await autoTransformPage(source, {
      relPath: "src/pages/index.astro",
      pageKey: "",
      pageJson: seeded,
      warn: silent,
      rng: seqRng(),
      flat: true,
      ownClaims: new Set(first!.autoPaths),
    });
    expect(second!.additions).toEqual([]); // NO duplicate key minted
    expect(second!.autoPaths).toContain(headingKey);
    expect(second!.code).toContain(`{"New headline from the hub"}`);
  });

  it("without persisted ownership the old bug appears (documents why _fields.json exists)", async () => {
    const source = `<section><h1>Old headline</h1></section>\n`;
    const first = await runFlat(source);
    const seeded = seedFrom(first!.additions);
    const headingKey = first!.autoPaths.find((p) => p.startsWith("heading_"))!;
    seeded[headingKey] = "New headline";
    const second = await runFlat(source, seeded); // ownClaims defaults empty
    // divergent literal + no ownership → fresh key minted (the pre-fix bug)
    expect(second!.additions.length).toBe(1);
    expect(second!.additions[0].path).not.toBe(headingKey);
  });
});

describe("flat contract — hardening (heavy-test finds)", () => {
  it("never marks head/meta elements with data-cms-variant", async () => {
    const source = `---
import siteData from "_site.json";
---

<html>
  <head>
    <meta property="og:site_name" content={siteData.variables.name} />
    <title>{siteData.variables.name}</title>
  </head>
  <body>
    <p>{siteData.variables.name}</p>
  </body>
</html>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    expect(result!.code).not.toMatch(/<meta[^>]*data-cms-variant/);
    expect(result!.code).not.toMatch(/<title[^>]*data-cms-variant/);
    expect(result!.code).toContain('<p data-cms-variant="name">');
  });
});

// ---------------------------------------------------------------------------
// v3 smarter wiring: inline-capture, slot text, frontmatter array lift
// ---------------------------------------------------------------------------

describe("flat contract — inline capture (mixed elements)", () => {
  it("captures text + spans as ONE rich field with per-occurrence classes", async () => {
    const source = `<section>
  <h1>Every forest is a galaxy,{" "}
    <span class="font-display text-fern italic">every star a seed.</span>{" "}
    and the <span class="text-nebula">ancient light</span> above.</h1>
</section>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const { code, additions } = result!;
    const seed = additions.find((a) => a.path.startsWith("heading_"));
    expect(seed!.value).toBe(
      "Every forest is a galaxy, `every star a seed.` and the `ancient light` above."
    );
    expect(code).toContain(
      'data-cms-hl-class="font-display text-fern italic||text-nebula"'
    );
    // always substituted through renderRich so the canvas can round-trip
    expect(code).toContain("<Fragment set:html={renderRich(");
    expect(code).toContain('"hlClass":["font-display text-fern italic","text-nebula"]');
  });

  it("strong maps to ** with its class; uncapturable stays a report", async () => {
    const good = await runFlat(`<section><p>Save <strong class="x">50%</strong> now</p></section>\n`);
    const seed = good!.additions.find((a) => a.path.startsWith("text_"));
    expect(seed!.value).toBe("Save **50%** now");
    // real expression inside → not capturable whole, but the static runs
    // around it wrap as their own fields
    const bad = await runFlat(`<section><p>Hello {user.name} friend</p></section>\n`);
    const values = (bad?.additions ?? []).map((a) => a.value);
    expect(values).toContain("Hello");
    expect(values).toContain("friend");
  });

  it("hub edit renders through renderRich with preserved classes", async () => {
    const source = `<section><h2>One story in <span class="text-fern">leaves</span></h2></section>\n`;
    const first = await runFlat(source);
    const key = first!.additions[0].path;
    const result = await autoTransformPage(source, {
      relPath: "src/components/x.astro", pageKey: "", warn: silent, rng: seqRng(), flat: true,
      pageJson: { [key]: "Rewritten in `light` by the hub" },
      ownClaims: new Set(first!.autoPaths),
    });
    expect(result!.code).toContain('renderRich("Rewritten in `light` by the hub"');
    expect(result!.additions).toEqual([]);
  });
});

describe("flat contract — component slot text", () => {
  it("wraps bare slot text in an injected editable span", async () => {
    const source = `---
import Eyebrow from "../components/site/eyebrow.astro";
---

<section>
  <Eyebrow>A field guide to everything</Eyebrow>
</section>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const seed = result!.additions.find((a) => a.value === "A field guide to everything");
    expect(seed).toBeDefined();
    expect(result!.code).toContain(
      `<Eyebrow><span data-cms-field="${seed!.path}" data-cms-kind="text">{"A field guide to everything"}</span></Eyebrow>`
    );
  });

  it("hub edit of slot text substitutes into the wrap", async () => {
    const source = `<div><Cta>Journey outward</Cta></div>\n`;
    const first = await runFlat(source);
    const key = first!.additions[0].path;
    const second = await autoTransformPage(source, {
      relPath: "src/components/x.astro", pageKey: "", warn: silent, rng: seqRng(), flat: true,
      pageJson: { [key]: "Take the trip" },
      ownClaims: new Set(first!.autoPaths),
    });
    expect(second!.code).toContain(`>{"Take the trip"}</span>`);
    expect(second!.additions).toEqual([]);
  });

  it("preserves an HTML entity and its trailing space in wrapped slot text", async () => {
    // Footer pattern: a bare `&copy;` run beside an expression. The entity must
    // survive (render © not "&copy;") and the space before {year} must remain.
    const source = `---
const year = 2026;
---

<footer>
  <p>&copy; {year} <span>EmpowerHer</span></p>
</footer>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const code = result!.code;
    // Entity single-escaped (browser renders ©), rendered via set:html…
    expect(code).toContain("renderRich(\"&copy;\")");
    expect(code).not.toContain("&amp;copy;");
    // …and the separating space before {year} is kept outside the span.
    expect(code).toMatch(/<\/span> \{year\}/);
  });
});

describe("flat contract — frontmatter array lift", () => {
  const PAGE = `---
const stats = [
  { value: "13.8B", label: "years since the universe began" },
  { value: "3T", label: "trees breathing on Earth right now" },
  { value: "2T", label: "galaxies in the observable universe" },
];
---

<section>
  <div class="grid">
    {stats.slice(0, 2).map((s, i) => (
      <div><p>{s.value}</p><p>{s.label}</p></div>
    ))}
  </div>
  <div class="grid2">
    {stats.slice(2).map((s, i) => (
      <div><p>{s.value}</p><p>{s.label}</p></div>
    ))}
  </div>
</section>
`;

  it("lifts a pure-literal const array with REAL items and wires sliced maps with absolute indices", async () => {
    const result = await runFlat(PAGE);
    expect(result).not.toBeNull();
    const seed = result!.additions.find((a) => /^stats_[a-z0-9]{4}$/.test(a.path));
    expect(seed).toBeDefined();
    expect((seed!.value as unknown[]).length).toBe(3);
    expect((seed!.value as any)[0].value).toBe("13.8B");
    const key = seed!.path;
    // RHS rewritten with array-checked fallback + pages import injected
    expect(result!.code).toContain(`import __cmsPages from "_pages.json";`);
    expect(result!.code).toContain(`(Array.isArray(__cmsPages["${key}"]) ? __cmsPages["${key}"] : [`);
    // sliced windows: absolute indices, no group host, no data-cms-item
    expect(result!.code).toContain("data-cms-field={`" + key + ".${i}.value`}");
    expect(result!.code).toContain("data-cms-field={`" + key + ".${i + 2}.value`}");
    expect(result!.code).not.toContain('data-cms-kind="group"');
    expect(result!.code).not.toContain("data-cms-item");
  });

  it("is idempotent: seeded array reuses its key, no re-seed", async () => {
    const first = await runFlat(PAGE);
    const seed = first!.additions.find((a) => /^stats_/.test(a.path))!;
    const second = await runFlat(PAGE, { [seed.path]: seed.value });
    expect(second!.additions).toEqual([]);
    expect(second!.code).toContain(`__cmsPages["${seed.path}"]`);
  });

  it("skips arrays referencing code (free identifiers)", async () => {
    const source = `---
const items = raw.filter((x) => x.ok);
const good = ["alpha text", "beta text"];
---

<div><p>Static line here</p></div>
`;
    const result = await runFlat(source);
    const lifted = result!.additions.filter((a) => a.path.includes("_") && Array.isArray(a.value));
    expect(lifted.length).toBe(1);
    expect(lifted[0].path).toMatch(/^good_/);
  });

  it("unsliced map over a lifted array still gets the full group contract", async () => {
    const source = `---
const links = [
  { href: "/nature", label: "Nature" },
  { href: "/cosmos", label: "Cosmos" },
];
---

<nav>
  <ul>
    {links.map((l, i) => (
      <li><a href={l.href}>{l.label}</a></li>
    ))}
  </ul>
</nav>
`;
    const result = await runFlat(source);
    const key = result!.additions.find((a) => /^links_/.test(a.path))!.path;
    expect(result!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(result!.code).toContain("data-cms-item={i}");
    expect(result!.code).toContain("data-cms-field={`" + key + ".${i}.href`}");
  });
});

describe("flat contract — lifted array literal sync", () => {
  const SRC = `---
const stats = [
  { value: "13.8B", label: "years since the universe began" },
  { value: "3T", label: "trees breathing on Earth" },
];
---

<div class="grid">{stats.map((s, i) => (<div><p>{s.value}</p></div>))}</div>
`;

  it("JSON edit rewrites the source const literal", async () => {
    const { syncArraysJsonToSource } = await import("../src/auto/frontmatter-arrays.js");
    const json = {
      stats_ab12: [
        { value: "99X", label: "edited in the hub" },
        { value: "3T", label: "trees breathing on Earth" },
        { value: "NEW", label: "added item" },
      ],
    };
    const out = syncArraysJsonToSource(SRC, json);
    expect(out).not.toBeNull();
    expect(out).toContain('value: "99X", label: "edited in the hub"');
    expect(out).toContain('value: "NEW", label: "added item"');
    // converges: second pass is a no-op
    expect(syncArraysJsonToSource(out!, json)).toBeNull();
    // still valid enough to lift again (evaluates)
    const evald = new Function('"use strict"; return (' + /=\s*(\[[\s\S]*?\n\])/.exec(out!)![1] + ")")();
    expect(evald.length).toBe(3);
  });

  it("source edit overwrites the JSON array (dev wins)", async () => {
    const { syncArraysSourceToJson } = await import("../src/auto/frontmatter-arrays.js");
    const json = { stats_ab12: [{ value: "OLD", label: "stale" }] };
    const overwrites = syncArraysSourceToJson(SRC, json);
    expect(overwrites.length).toBe(1);
    expect(overwrites[0].path).toBe("stats_ab12");
    expect((overwrites[0].value as any)[0].value).toBe("13.8B");
    // in sync → no overwrites
    const synced = { stats_ab12: (overwrites[0].value as unknown[]) };
    expect(syncArraysSourceToJson(SRC, synced)).toEqual([]);
  });
});

describe("flat contract — deep-nesting torture (round 2)", () => {
  it("span-in-span flattens into one accent with the outer class", async () => {
    const r = await runFlat(`<section><h1>Outer <span class="a">one <span class="b">two</span></span> tail</h1></section>\n`);
    const seed = r!.additions.find((a) => a.path.startsWith("heading_"));
    expect(seed!.value).toBe("Outer `one two` tail");
    expect(r!.code).toContain('data-cms-hl-class="a"');
  });

  it("li / dt / dd become editable text fields", async () => {
    const r = await runFlat(`<section><ul><li>Alpha item</li><li>Beta <span class="x">accent</span></li></ul><dl><dt>Term</dt><dd>Definition text</dd></dl></section>\n`);
    const values = r!.additions.map((a) => a.value);
    expect(values).toContain("Alpha item");
    expect(values).toContain("Beta `accent`");
    expect(values).toContain("Term");
    expect(values).toContain("Definition text");
  });

  it("anchor with nested-span label flattens; substitution replaces inner", async () => {
    const src = `<section><a href="/go"><span>Outer <span class="i">inner</span></span></a></section>\n`;
    const first = await runFlat(src);
    const seed = first!.additions.find((a) => a.path.startsWith("cta_"));
    expect(seed!.value).toEqual({ label: "Outer inner", link: "/go" });
    const second = await autoTransformPage(src, {
      relPath: "p", pageKey: "", warn: silent, rng: seqRng(), flat: true,
      pageJson: { [seed!.path]: { label: "Edited label", link: "/new" } },
      ownClaims: new Set(first!.autoPaths),
    });
    expect(second!.code).toContain('href={"/new"}');
    expect(second!.code).toContain('{"Edited label"}');
  });

  it("a-inside-a: outer skipped, inner wired; bare div text is a leaf field", async () => {
    const r = await runFlat(`<section><div>Bare div text here</div><a href="/o">Outer <a href="/i">inner</a></a></section>\n`);
    const seeds = r?.additions ?? [];
    expect(seeds.find((a) => a.value === "Bare div text here")).toBeDefined();
    const cta = seeds.find((a) => a.path.startsWith("cta_"));
    expect((cta?.value as any)?.link).toBe("/i");
  });

  it("same const name in two files gets ISOLATED keys (foreign scope)", async () => {
    const SRC = `---
const cards = [{ title: "Mine", text: "Body" }];
---

<div class="g">{cards.map((c) => (<div><h4>{c.title}</h4></div>))}</div>
`;
    const a = await runFlat(SRC);
    const keyA = a!.additions.find((x) => /^cards_/.test(x.path))!.path;
    // second file: same name, other file's key is FOREIGN
    const b = await autoTransformPage(SRC.replace("Mine", "Other file"), {
      relPath: "src/components/other.astro", pageKey: "", warn: silent,
      rng: seqRng(), flat: true,
      pageJson: { [keyA]: [{ title: "Mine", text: "Body" }] },
      externalClaims: new Set([keyA]), ownClaims: new Set(),
    });
    const keyB = b!.additions.find((x) => /^cards_/.test(x.path))!.path;
    expect(keyB).not.toBe(keyA);
  });
});

describe("claims merge-on-save", () => {
  it("an instance never clobbers other files' persisted entries", async () => {
    const fsm = await import("node:fs");
    const os = await import("node:os");
    const pathm = await import("node:path");
    const { loadClaims, saveClaims } = await import("../src/auto/claims.js");
    const dir = fsm.mkdtempSync(pathm.join(os.tmpdir(), "claims-"));
    fsm.writeFileSync(pathm.join(dir, "a.astro"), "x");
    fsm.writeFileSync(pathm.join(dir, "b.astro"), "x");
    fsm.writeFileSync(pathm.join(dir, "_fields.json"), JSON.stringify({ "a.astro": ["text_aaaa"] }));
    // stale instance knows only b — must NOT drop a's entry
    const stale = new Map([["b.astro", new Set(["text_bbbb"])]]);
    saveClaims(dir, stale, () => {});
    const merged = loadClaims(dir);
    expect([...(merged.get("a.astro") ?? [])]).toEqual(["text_aaaa"]);
    expect([...(merged.get("b.astro") ?? [])]).toEqual(["text_bbbb"]);
    fsm.rmSync(dir, { recursive: true, force: true });
  });
});

describe("flat contract — leaf div/span wiring", () => {
  it("wires lone spans, bare-text divs, and mixed-inline divs", async () => {
    const r = await runFlat(`<section>
  <span>lone span at section level</span>
  <div>Bare text directly in a div</div>
  <div>Mixed div text <span class="q">span bit</span> more div text</div>
</section>
`);
    const values = r!.additions.map((a) => a.value);
    expect(values).toContain("lone span at section level");
    expect(values).toContain("Bare text directly in a div");
    expect(values).toContain("Mixed div text `span bit` more div text");
  });

  it("layout wrappers: block children wire AND stray text runs wrap as fields", async () => {
    const r = await runFlat(`<section>
  <div class="wrap">Wrapper stray text
    <p>Real paragraph child</p>
  </div>
</section>
`);
    const values = r!.additions.map((a) => a.value);
    expect(values).toContain("Real paragraph child");
    expect(values).toContain("Wrapper stray text");
  });

  it("div inside a span: inner leaf div wires, outer span skips", async () => {
    const r = await runFlat(`<section><span class="holder">Span text <div>Div inside a span</div></span></section>\n`);
    const values = r!.additions.map((a) => a.value);
    expect(values).toContain("Div inside a span");
  });
});

describe("flat contract — interleaved text runs (p with link inside)", () => {
  it("wraps text runs around an inner link; link wires separately", async () => {
    const src = `<section><p>Para with <a href="/x">link inside</a> and trailing text</p></section>\n`;
    const r = await runFlat(src);
    const values = r!.additions.map((a) => a.value);
    expect(values).toContain("Para with");
    expect(values).toContain("and trailing text");
    const cta = r!.additions.find((a) => a.path.startsWith("cta_"));
    expect((cta!.value as any).label).toBe("link inside");
    // output wraps both runs in editable spans
    expect((r!.code.match(/<span data-cms-field="text_[a-z0-9]{4}" data-cms-kind="text">/g) ?? []).length).toBe(2);
  });

  it("hub edit of a wrapped run substitutes in place", async () => {
    const src = `<section><p>Before <a href="/x">go</a> after words</p></section>\n`;
    const first = await runFlat(src);
    const key = first!.additions.find((a) => a.value === "after words")!.path;
    const second = await autoTransformPage(src, {
      relPath: "p", pageKey: "", warn: silent, rng: seqRng(), flat: true,
      pageJson: Object.fromEntries(first!.additions.map((a) => [a.path, a.value])),
      ownClaims: new Set(first!.autoPaths),
    });
    expect(second!.additions).toEqual([]);
    const edited = await autoTransformPage(src, {
      relPath: "p", pageKey: "", warn: silent, rng: seqRng(), flat: true,
      pageJson: { ...Object.fromEntries(first!.additions.map((a) => [a.path, a.value])), [key]: "changed tail" },
      ownClaims: new Set(first!.autoPaths),
    });
    expect(edited!.code).toContain('>{"changed tail"}</span>');
  });
});

describe("flat contract — same-tag nesting close (HerVoice bug)", () => {
  it("span-wrapping-span captures with the OUTER closing tag intact", async () => {
    const source = `<section>
  <h2 class="big">
    <span>HerVoice <span class="cms-hl">2026</span></span>
    <br />
    <span>Writing Contest</span>
  </h2>
</section>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    // no orphan closing tag: equal open/close span counts in output
    const opens = (r!.code.match(/<span/g) ?? []).length;
    const closes = (r!.code.match(/<\/span>/g) ?? []).length;
    expect(opens).toBe(closes);
    const values = r!.additions.map((a) => a.value);
    expect(values).toContain("HerVoice `2026`");
    expect(values).toContain("Writing Contest");
  });
});

describe("flat contract — && guard transparency (Partners bug)", () => {
  it("wires content inside {cond && ( ... )} guards", async () => {
    const source = `---
const partners = [{ name: "X" }];
---

{
  partners.length > 0 && (
    <section class="py-28">
      <p class="text-xs uppercase">Trusted Partners & Supporters</p>
      <div class="grid">
        {partners.map((p) => (
          <a href="/x">{p.name}</a>
        ))}
      </div>
    </section>
  )
}
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const seed = r!.additions.find((a) => a.value === "Trusted Partners & Supporters");
    expect(seed).toBeDefined();
    expect(r!.code).toContain(`data-cms-field="${seed!.path}"`);
  });

  it("ternaries and maps stay hard boundaries", async () => {
    const source = `<section>{ok ? (<p>Yes branch text</p>) : (<p>No branch text</p>)}</section>\n`;
    const r = await runFlat(source);
    expect((r?.additions ?? []).length).toBe(0);
  });
});

describe("flat contract — component-wrapped map items (Reveal pattern)", () => {
  it("descends through a component root to the element item root", async () => {
    const source = `---
const pillars = [
  { index: "01", title: "Advocacy", description: "Long body text here." },
  { index: "02", title: "Education", description: "Second body text." },
];
---

<div class="divide-y">
  {pillars.map((item, i) => (
    <Reveal delay={i * 80}>
      <div class="row">
        <span>{item.index}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </Reveal>
  ))}
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const key = r!.additions.find((a) => /^pillars_/.test(a.path))!.path;
    expect(r!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(r!.code).toContain('<div class="row" data-cms-item={i}>');
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.title`}");
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.description`}");
  });
});

describe("flat contract — block-body map with icon zip (SPR Benefits bug)", () => {
  it("wires maps whose arrow body is { const …; return ( <root/> ) }", async () => {
    const source = `---
const items = [
  { title: "Hands-On Leadership", description: "Gain practical skills leading classes." },
  { title: "Professional Development", description: "Learn how a nonprofit operates." },
];
const icons = ["a", "b"];
---

<div class="grid">
  {
    items.map((benefit, i) => {
      const icon = icons[i % icons.length];
      return (
        <div class="card">
          <h3>{benefit.title}</h3>
          <p>{benefit.description}</p>
        </div>
      );
    })
  }
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const key = r!.additions.find((a) => /^items_/.test(a.path))!.path;
    expect(r!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(r!.code).toContain('<div class="card" data-cms-item={i}>');
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.title`}");
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.description`}");
  });
});

describe("flat contract — destructured map params (HerVoice guidelines bug)", () => {
  it("wires maps with ({ label, text }) destructured params", async () => {
    const source = `---
const guidelines = [
  { label: "Content Quality", text: "Write from the heart with honest reflection." },
  { label: "Image Required", text: "Include a relevant image for your story." },
];
---

<div class="space-y-5">
  {
    guidelines.map(({ label, text }) => (
      <div class="row">
        <p class="font-semibold">{label}</p>
        <p class="mt-1">{text}</p>
      </div>
    ))
  }
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const key = r!.additions.find((a) => /^guidelines_/.test(a.path))!.path;
    expect(r!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(r!.code).toContain("guidelines.map(({ label, text }, i) => (");
    expect(r!.code).toContain('<div class="row" data-cms-item={i}>');
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.label`}");
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.text`}");
  });

  it("skips destructures with renames or defaults (ambiguous keys)", async () => {
    const source = `---
const rows = [{ a: "First value here", b: "Second value here" }];
---

<div>{rows.map(({ a: renamed, b }) => (<p>{renamed}</p>))}</div>
`;
    const r = await runFlat(source);
    expect(r?.code ?? "").not.toContain('data-cms-kind="group"');
  });
});

describe("flat contract — dynamic-tag map item roots (hazara bento-grid bug)", () => {
  it("wires maps whose item root is a dynamic tag binding", async () => {
    const source = `---
const services = [
  { title: "Job Training & Placement", description: "Helping community members build skills.", href: "/services/job-training" },
  { title: "Financial Literacy", description: "Workshops on budgeting and banking.", href: "#" },
];
---

<div class="grid">
  {
    services.map((service, i) => {
      const isExternal = service.href.startsWith("#");
      const Tag = isExternal ? "div" : "a";
      return (
        <Tag href={isExternal ? undefined : service.href} class="card">
          <h3 class="text-lg">{service.title}</h3>
          <p class="mt-3">{service.description}</p>
        </Tag>
      );
    })
  }
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const key = r!.additions.find((a) => /^services_/.test(a.path))!.path;
    expect(r!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(r!.code).toContain("<Tag");
    expect(r!.code).toContain("data-cms-item={i}");
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.title`}");
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.description`}");
  });

  it("still descends real component wrappers (no dynamic-tag binding)", async () => {
    const source = `---
const cards = [{ title: "First card title", text: "First card body text." }];
---

<div class="grid">
  {
    cards.map((card) => (
      <Reveal>
        <div class="card">
          <h3>{card.title}</h3>
          <p>{card.text}</p>
        </div>
      </Reveal>
    ))
  }
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    expect(r!.code).toContain('<div class="card" data-cms-item={i}>');
  });
});

describe("flat contract — string-array loops (fla2z trust-badges bug)", () => {
  it("wires bare {item} members with the index-only path", async () => {
    const source = `---
const trustBadges = ["Licensed & insured GC", "15 years building in Florida"];
---

<div class="mt-14 flex">
  {
    trustBadges.map((label) => (
      <div class="flex items-baseline">
        <span class="h-2.5 w-2.5" />
        <span class="text-[13px] uppercase">{label}</span>
      </div>
    ))
  }
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const key = r!.additions.find((a) => /^trustBadges_/.test(a.path))!.path;
    expect(r!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(r!.code).toContain('<div class="flex items-baseline" data-cms-item={i}>');
    expect(r!.code).toContain(
      "data-cms-field={`" + key + ".${i}`} data-cms-kind=\"text\""
    );
  });

  it("bootstraps a missing string array from a bare accessor", async () => {
    const source = `---
import pages from "_pages.json";
---

<ul>
  {pages.tags.map((tag) => (
    <li class="tag">{tag}</li>
  ))}
</ul>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const seeded = r!.additions.find((a) => /^tags_/.test(a.path));
    expect(seeded).toBeDefined();
    expect(seeded!.value).toEqual(["Item"]);
  });
});

describe("flat contract — nested member-array maps (fla2z services bullets bug)", () => {
  it("wires {item.sub.map(…)} as a sub-group with its own item stamps", async () => {
    const source = `---
const serviceItems = [
  {
    name: "New construction",
    copy: "Ground-up residential builds run on a written scope.",
    bullets: ["Site prep & foundation", "Framing & roofing", "Final inspections"],
  },
];
---

<div>
  {
    serviceItems.map((svc) => (
      <section class="py-16">
        <h2>{svc.name}</h2>
        <p>{svc.copy}</p>
        <div class="mt-7 grid">
          {svc.bullets.map((b) => (
            <div class="flex items-baseline">
              <span class="h-2 w-2" />
              <span class="text-[15px]">{b}</span>
            </div>
          ))}
        </div>
      </section>
    ))
  }
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const key = r!.additions.find((a) => /^serviceItems_/.test(a.path))!.path;
    expect(r!.code).toContain(`data-cms-field="${key}" data-cms-kind="group"`);
    expect(r!.code).toContain('<section class="py-16" data-cms-item={i}>');
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.name`}");
    // Sub-group host + spliced inner index + index-only inner member paths.
    expect(r!.code).toContain(
      "data-cms-field={`" + key + ".${i}.bullets`} data-cms-kind=\"group\""
    );
    expect(r!.code).toContain("svc.bullets.map((b, j) => (");
    expect(r!.code).toContain('<div class="flex items-baseline" data-cms-item={j}>');
    expect(r!.code).toContain(
      "data-cms-field={`" + key + ".${i}.bullets.${j}`} data-cms-kind=\"text\""
    );
  });

  it("wires dotted accessors inside nested maps and reuses an existing inner index", async () => {
    const source = `---
const faqs = [
  {
    topic: "Permits",
    entries: [{ q: "Do you pull permits?", a: "Yes, on every job." }],
  },
];
---

<div>
  {
    faqs.map((faq) => (
      <section class="faq">
        <h2>{faq.topic}</h2>
        <div class="entries">
          {faq.entries.map((entry, n) => (
            <div class="entry">
              <h3>{entry.q}</h3>
              <p>{entry.a}</p>
            </div>
          ))}
        </div>
      </section>
    ))
  }
</div>
`;
    const r = await runFlat(source);
    expect(r).not.toBeNull();
    const key = r!.additions.find((a) => /^faqs_/.test(a.path))!.path;
    expect(r!.code).toContain(
      "data-cms-field={`" + key + ".${i}.entries`} data-cms-kind=\"group\""
    );
    expect(r!.code).toContain("faq.entries.map((entry, n) => (");
    expect(r!.code).toContain('<div class="entry" data-cms-item={n}>');
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.entries.${n}.q`}");
    expect(r!.code).toContain("data-cms-field={`" + key + ".${i}.entries.${n}.a`}");
  });
});

describe("flat contract — variable guards never mark ancestors (fla2z green-section bug)", () => {
  it("fragment-bodied guard: container stays unmarked, inner display still marks", async () => {
    const source = `---
import siteData from "_site.json";

const site = siteData.variables;
---

<div class="mx-auto max-w-[1200px]">
  <section id="services">
    <h2>Residential work, permit to punch list.</h2>
  </section>
  {site.reviewCount > 0 && (
    <>
      <hr class="divider" />
      <section id="reviews">
        <p class="rating">{site.rating}</p>
      </section>
    </>
  )}
</div>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const { code } = result!;
    expect(code).not.toContain('<div class="mx-auto max-w-[1200px]" data-cms-variant');
    expect(code).not.toContain('data-cms-variant="reviewCount"');
    expect(code).toContain('<p class="rating" data-cms-variant="rating">');
  });

  it("multi-root guard body is transparent too", async () => {
    const source = `---
import siteData from "_site.json";

const site = siteData.variables;
---

<div class="page">
  {site.reviewCount > 0 && (
    <hr class="divider" />
    <section id="reviews">
      <p class="rating">{site.rating}</p>
    </section>
  )}
</div>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const { code } = result!;
    expect(code).not.toContain('<div class="page" data-cms-variant');
    expect(code).toContain('<p class="rating" data-cms-variant="rating">');
  });
});

describe("flat contract — Region subtrees are never auto-wired (fla2z junk-seeds bug)", () => {
  it("static text runs inside <Region> variants stay unwired and unseeded", async () => {
    const source = `---
import siteData from "_site.json";

const site = siteData.variables;
---

<footer>
  <Region type="variant" variantName="serviceArea">
    <p class="m-0 text-sm">Serving {site.serviceArea}</p>
  </Region>
  <Region type="variant" variantName="name">
    <span class="text-[13px]">&copy; 2026 {site.name}. All rights reserved.</span>
  </Region>
  <p class="keep">Family-run since 2011.</p>
</footer>
`;
    const result = await runFlat(source);
    expect(result).not.toBeNull();
    const { code, additions } = result!;
    const values = additions.map((a) => a.value);
    expect(values).not.toContain("Serving");
    expect(values.some((v) => typeof v === "string" && v.includes("rights reserved"))).toBe(false);
    expect(values).toContain("Family-run since 2011.");
    expect(code).not.toMatch(/<p class="m-0 text-sm" data-cms-field/);
    expect(code).not.toMatch(/<span class="text-\[13px\]" data-cms-field/);
  });

  it("collection Region content is untouched too", async () => {
    const source = `---
import reviewItems from "_collections/reviews.json";
---

<section>
  <Region type="collection" name="reviews">
    <div class="grid">
      {reviewItems.map((rev) => (
        <div class="card">
          <p>Verified customer</p>
          <p>{rev.quote}</p>
        </div>
      ))}
    </div>
  </Region>
</section>
`;
    // Nothing to wire at all → transform reports no changes (null) or, at
    // most, changes that never touch the Region's content.
    const result = await runFlat(source);
    expect(
      (result?.additions ?? []).map((a) => a.value)
    ).not.toContain("Verified customer");
    expect(result?.code ?? "").not.toContain('data-cms-field');
  });
});
