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
