import { describe, expect, it } from "vitest";

import {
  collectionField,
  collectionListField,
  getAtPath,
  humanize,
  inferField,
  inferFields,
  placeholderFromFields,
  setAtPath,
} from "../src/schema/form-schema";

describe("humanize", () => {
  it("splits camelCase and capitalizes", () => {
    expect(humanize("heroTitle")).toBe("Hero Title");
    expect(humanize("imageAlt")).toBe("Image Alt");
    expect(humanize("cta")).toBe("Cta");
    expect(humanize("maps_url")).toBe("Maps url");
  });
});

describe("inferField", () => {
  it("short string → single-line text", () => {
    expect(inferField("heading", "Welcome", "hero.heading")).toEqual({
      kind: "text",
      path: "hero.heading",
      label: "Heading",
      multiline: false,
    });
  });

  it("long string → multiline", () => {
    const long = "x".repeat(120);
    expect(inferField("text", long, "hero.text")).toMatchObject({
      kind: "text",
      multiline: true,
    });
  });

  it("media-looking strings → image", () => {
    expect(inferField("photo", "/media/hero.jpg", "hero.photo")).toMatchObject({
      kind: "image",
    });
    expect(inferField("logo", "", "logo")).toMatchObject({ kind: "image" });
    expect(
      inferField("banner", "https://cdn.x.com/a.webp?v=2", "banner")
    ).toMatchObject({ kind: "image" });
  });

  it("{label, link} object → link pair", () => {
    expect(
      inferField("cta", { label: "Reserve", link: "/contact" }, "hero.cta")
    ).toMatchObject({ kind: "link" });
  });

  it("boolean / number", () => {
    expect(inferField("featured", true, "featured")).toMatchObject({
      kind: "boolean",
    });
    expect(inferField("year", 1962, "year")).toMatchObject({ kind: "number" });
  });

  it("nested object → group with child paths", () => {
    const field = inferField(
      "address",
      { street: "1 Main St", city: "Miami" },
      "address"
    );
    expect(field).toMatchObject({ kind: "group", path: "address" });
    expect((field as any).fields.map((f: any) => f.path)).toEqual([
      "address.street",
      "address.city",
    ]);
  });

  it("array → list with a label key from the first item", () => {
    const field = inferField(
      "socials",
      [{ label: "Instagram", url: "https://instagram.com/x" }],
      "socials"
    );
    expect(field).toMatchObject({ kind: "list", itemLabelKey: "label" });
  });
});

describe("inferFields", () => {
  it("walks a page slice like the contract example", () => {
    const hero = {
      heading: "Wood-fired **pasta**",
      text: "Family recipes since 1962.",
      image: "/media/hero.jpg",
      imageAlt: "A plate of pasta",
      cta: { label: "Reserve a table", link: "/contact" },
    };
    const fields = inferFields({ hero }, "home");
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ kind: "group", path: "home.hero" });
    const kinds = (fields[0] as any).fields.map((f: any) => [f.path, f.kind]);
    expect(kinds).toEqual([
      ["home.hero.heading", "text"],
      ["home.hero.text", "text"],
      ["home.hero.image", "image"],
      ["home.hero.imageAlt", "text"],
      ["home.hero.cta", "link"],
    ]);
  });
});

describe("collection fields", () => {
  const defs = [
    { name: "name", type: "string", required: true },
    { name: "bio", type: "text" },
    { name: "headshot", type: "image" },
    { name: "group", type: "select", options: ["Team", "Board"] },
    { name: "featured", type: "boolean" },
  ];

  it("maps explicit types onto widgets", () => {
    expect(collectionField(defs[0]!)).toMatchObject({
      kind: "text",
      multiline: false,
    });
    expect(collectionField(defs[1]!)).toMatchObject({
      kind: "text",
      multiline: true,
    });
    expect(collectionField(defs[2]!)).toMatchObject({ kind: "image" });
    expect(collectionField(defs[3]!)).toMatchObject({
      kind: "select",
      options: ["Team", "Board"],
    });
  });

  it("placeholder mirrors cms-bridge defaults", () => {
    expect(placeholderFromFields(defs)).toEqual({
      name: "",
      bio: "",
      headshot: "",
      group: "",
      featured: false,
    });
  });

  it("collectionListField picks the first string field as the item label", () => {
    const field = collectionListField({ name: "team", fields: defs });
    expect(field).toMatchObject({
      kind: "list",
      path: "",
      label: "Team",
      itemLabelKey: "name",
    });
  });
});

describe("path helpers", () => {
  const root = { home: { hero: { heading: "Hi", cta: { label: "Go" } } } };

  it("getAtPath reads dot paths and returns root for empty path", () => {
    expect(getAtPath(root, "home.hero.heading")).toBe("Hi");
    expect(getAtPath(root, "")).toBe(root);
    expect(getAtPath(root, "home.missing.deep")).toBeUndefined();
  });

  it("setAtPath writes without mutating and shares untouched branches", () => {
    const next = setAtPath(root, "home.hero.heading", "Hello");
    expect(getAtPath(next, "home.hero.heading")).toBe("Hello");
    expect(getAtPath(root, "home.hero.heading")).toBe("Hi");
    expect((next as any).home.hero.cta).toBe(root.home.hero.cta);
  });

  it("setAtPath handles array indices", () => {
    const list = { items: [{ title: "a" }, { title: "b" }] };
    const next = setAtPath(list, "items.1.title", "B");
    expect((next as any).items[1].title).toBe("B");
    expect((next as any).items[0]).toBe(list.items[0]);
    expect(Array.isArray((next as any).items)).toBe(true);
  });

  it("setAtPath with empty path replaces the root (array collections)", () => {
    expect(setAtPath([1, 2], "", [2, 1])).toEqual([2, 1]);
  });
});
