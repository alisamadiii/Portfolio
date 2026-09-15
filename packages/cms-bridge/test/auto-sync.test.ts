import { describe, expect, it } from "vitest";

import { syncJsonToSource, syncSourceToJson } from "../src/auto/sync.js";

const silent = () => {};

// The source carries NO data-cms attrs — sync binds elements to keys via
// bind.ts (value match first, ordinal fallback), same as the transform.
const PAGE = `<main>
  <section>
    <h2>Built for teams</h2>
    <p>Launch fast.</p>
    <a href="/contact">Start today</a>
    <img src="/media/a.png" alt="Old alt" />
  </section>
</main>
`;

const seeded = () => ({
  title_k4f2: "Built for teams",
  text_x8n1: "Launch fast.",
  cta_r7t3: { label: "Start today", link: "/contact" },
  image_p2m9: "/media/a.png",
  image_p2m9Alt: "Old alt",
});

describe("syncJsonToSource", () => {
  it("rewrites literals to match hub-edited JSON (ordinal binding)", async () => {
    const json = seeded();
    json.title_k4f2 = "From the hub";
    json.text_x8n1 = "Ship faster.";
    json.cta_r7t3 = { label: "Go", link: "/go" };
    json.image_p2m9 = "/media/b.png";
    const { newSource } = await syncJsonToSource(PAGE, "p.astro", "home", json, silent);
    expect(newSource).not.toBeNull();
    expect(newSource).toContain("<h2>From the hub</h2>");
    expect(newSource).toContain("<p>Ship faster.</p>");
    expect(newSource).toContain('href="/go"');
    expect(newSource).toContain(">Go</a>");
    expect(newSource).toContain('src="/media/b.png"');
    // still zero data-cms attrs in the source
    expect(newSource).not.toContain("data-cms");
  });

  it("is a no-op when values already match (convergence)", async () => {
    const { newSource } = await syncJsonToSource(PAGE, "p.astro", "home", seeded(), silent);
    expect(newSource).toBeNull();
  });

  it("skips unsafe values (braces, rich markers) — substitution covers them", async () => {
    const json = seeded();
    json.title_k4f2 = "Uses {braces}";
    json.text_x8n1 = "Rich **bold** value";
    const { newSource } = await syncJsonToSource(PAGE, "p.astro", "home", json, silent);
    expect(newSource).toBeNull();
  });

  it("leaves unseeded elements alone (no key to bind)", async () => {
    const json = { title_k4f2: "Changed" }; // only the heading is seeded
    const { newSource } = await syncJsonToSource(PAGE, "p.astro", "home", json, silent);
    expect(newSource).toContain("<h2>Changed</h2>");
    expect(newSource).toContain("<p>Launch fast.</p>"); // untouched
  });
});

describe("syncSourceToJson", () => {
  it("overwrites JSON values that differ from the source literal", async () => {
    const json = seeded();
    json.title_k4f2 = "Stale value";
    json.image_p2m9Alt = "Stale alt";
    const overwrites = await syncSourceToJson(PAGE, "p.astro", "home", json);
    const byPath = Object.fromEntries(overwrites.map((o) => [o.path, o.value]));
    expect(byPath["title_k4f2"]).toBe("Built for teams");
    expect(byPath["image_p2m9Alt"]).toBe("Old alt");
  });

  it("returns nothing when in sync (convergence)", async () => {
    expect(await syncSourceToJson(PAGE, "p.astro", "home", seeded())).toEqual([]);
  });

  it("does not clobber rich-marker JSON values with the plain seed", async () => {
    const json = seeded();
    json.text_x8n1 = "Launch **really** fast.";
    const overwrites = await syncSourceToJson(PAGE, "p.astro", "home", json);
    expect(overwrites.find((o) => o.path === "text_x8n1")).toBeUndefined();
  });

  it("reorder does not produce phantom overwrites (value binding)", async () => {
    const reordered = `<main>
  <section>
    <p>Launch fast.</p>
    <h2>Built for teams</h2>
    <a href="/contact">Start today</a>
    <img src="/media/a.png" alt="Old alt" />
  </section>
</main>
`;
    expect(await syncSourceToJson(reordered, "p.astro", "home", seeded())).toEqual([]);
  });
});
