import { describe, expect, it } from "vitest";

import type { Field } from "@workspace/cms-core/types/field";

import { computeArrayCollectionDiff, computeEntryDiff } from "./entry-diff";

/** Gallery-shaped inferred fields: no scalar string field at all. */
const galleryFields = [
  { name: "comparison", label: "Comparison", type: "boolean" },
  { name: "images", label: "Images", type: "string", list: true },
] as unknown as Field[];

const titledFields = [
  { name: "title", label: "Title", type: "string" },
  { name: "body", label: "Body", type: "text" },
] as unknown as Field[];

const item = (before: string, after: string) => ({
  comparison: true,
  images: [before, after],
});

describe("computeArrayCollectionDiff", () => {
  it("add one item → exactly one added row, no phantom removed (reported bug)", () => {
    const oldArray = [
      item("/media/a-before.jpeg", "/media/a-after.jpeg"),
      item("/media/b-before.jpeg", "/media/b-after.jpeg"),
    ];
    const added = item("/media/c-before.jpeg", "/media/c-after.jpeg");
    const rows = computeArrayCollectionDiff(galleryFields, oldArray, [
      added,
      ...oldArray,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("added");
    expect(rows[0]!.fieldPath).toBe("items.0");
    expect(rows[0]!.new).toEqual(added);
  });

  it("survives cosmetic rewrites: key order + injected defaults", () => {
    // Upstream serialized with different key order than the draft.
    const oldArray = [
      { images: ["/media/a.jpeg"], comparison: true },
      { images: ["/media/b.jpeg"], comparison: true },
    ];
    const newArray = [
      { comparison: true, images: ["/media/a.jpeg"] },
      { comparison: true, images: ["/media/b.jpeg"] },
      { comparison: true, images: ["/media/c.jpeg"] },
    ];
    const rows = computeArrayCollectionDiff(galleryFields, oldArray, newArray);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("added");
  });

  it("delete one of two identical items → exactly one removed", () => {
    const dup = item("/media/a.jpeg", "/media/b.jpeg");
    const rows = computeArrayCollectionDiff(galleryFields, [dup, dup], [dup]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("removed");
    expect(rows[0]!.fieldPath).toBe("items.removed.0");
  });

  it("two identical added items → two added rows", () => {
    const dup = item("/media/a.jpeg", "/media/b.jpeg");
    const rows = computeArrayCollectionDiff(galleryFields, [], [dup, dup]);
    expect(rows.filter((row) => row.kind === "added")).toHaveLength(2);
  });

  it("edit one field of a keyed item → per-field changed row at new index", () => {
    const oldArray = [
      { title: "First", body: "one" },
      { title: "Second", body: "two" },
    ];
    const newArray = [
      { title: "First", body: "one" },
      { title: "Second", body: "two edited" },
    ];
    const rows = computeArrayCollectionDiff(titledFields, oldArray, newArray);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("changed");
    expect(rows[0]!.fieldPath).toBe("items.1.body");
    expect(rows[0]!.label).toBe("Second › Body");
  });

  it("edit description + append image on one item → changed only (reported bug #2)", () => {
    const fields = [
      { name: "comparison", label: "Comparison", type: "boolean" },
      { name: "images", label: "Images", type: "string", list: true },
      { name: "description", label: "Description", type: "string" },
    ] as unknown as Field[];
    const untouched = {
      comparison: true,
      images: ["/media/a-before.jpeg", "/media/a-after.jpeg"],
      description: "kitchen",
    };
    const oldArray = [
      untouched,
      {
        comparison: true,
        images: ["/media/b-before.jpeg", "/media/b-after.jpeg"],
        description: "",
      },
    ];
    const newArray = [
      untouched,
      {
        comparison: true,
        images: [
          "/media/b-before.jpeg",
          "/media/b-after.jpeg",
          "https://ik.imagekit.io/extra.jpg",
        ],
        description: "asfdasdf",
      },
    ];
    const rows = computeArrayCollectionDiff(fields, oldArray, newArray);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.fieldPath.startsWith("items.1."))).toBe(
      true
    );
    expect(rows.some((row) => row.fieldPath.includes("removed"))).toBe(false);
  });

  it("list partial overlap alone → changed, not add+remove", () => {
    const rows = computeArrayCollectionDiff(
      galleryFields,
      [item("/media/a.jpeg", "/media/b.jpeg")],
      [{ comparison: true, images: ["/media/a.jpeg", "/media/b.jpeg", "/media/c.jpeg"] }]
    );
    // Item paired → per-field sub-row (the appended image), not a whole-item
    // add+remove pair.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.fieldPath).toBe("items.0.images.2");
    expect(rows.some((row) => row.fieldPath.includes("removed"))).toBe(false);
  });

  it("two edited items → each pairs with its own original, no cross-pairing", () => {
    const oldArray = [
      { title: "First post", body: "alpha content here" },
      { title: "Second post", body: "beta content here" },
    ];
    const newArray = [
      { title: "First post renamed", body: "alpha content here" },
      { title: "Second post renamed", body: "beta content here" },
    ];
    const rows = computeArrayCollectionDiff(titledFields, oldArray, newArray);
    expect(rows.map((row) => row.fieldPath).sort()).toEqual([
      "items.0.title",
      "items.1.title",
    ]);
    expect(rows.every((row) => row.kind === "changed")).toBe(true);
    // Bodies didn't change — each item must have paired with its own original.
    expect(rows.some((row) => row.fieldPath.endsWith(".body"))).toBe(false);
  });

  it("nested object item edit → leaf similarity pairs through depth", () => {
    const nestedFields = [
      { name: "description", label: "Description", type: "string" },
      {
        name: "meta",
        label: "Meta",
        type: "object",
        fields: [
          { name: "city", label: "City", type: "string" },
          { name: "year", label: "Year", type: "number" },
        ],
      },
    ] as unknown as Field[];
    const rows = computeArrayCollectionDiff(
      nestedFields,
      [{ description: "", meta: { city: "Tampa", year: 2024 } }],
      [{ description: "remodel", meta: { city: "Tampa", year: 2024 } }]
    );
    // Paired through the nested meta object → single filled-field sub-row.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.fieldPath).toBe("items.0.description");
    expect(rows[0]!.kind).toBe("added");
  });

  it("renamed primary value → fuzzy-paired as changed, not add+remove", () => {
    const oldArray = [{ title: "Old title", body: "same body" }];
    const newArray = [{ title: "New title", body: "same body" }];
    const rows = computeArrayCollectionDiff(titledFields, oldArray, newArray);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("changed");
    expect(rows[0]!.fieldPath).toBe("items.0.title");
  });

  it("nothing in common → add + remove pair (fuzzy below threshold)", () => {
    const rows = computeArrayCollectionDiff(
      titledFields,
      [{ title: "A", body: "aaa" }],
      [{ title: "B", body: "bbb" }]
    );
    expect(rows.map((row) => row.kind).sort()).toEqual(["added", "removed"]);
  });

  it("two new items competing for one old → best fuzzy match wins", () => {
    const oldArray = [{ title: "Post", body: "original body" }];
    const newArray = [
      { title: "Renamed post", body: "original body" }, // strong match
      { title: "Brand new", body: "fresh" }, // no match
    ];
    const rows = computeArrayCollectionDiff(titledFields, oldArray, newArray);
    const changed = rows.filter((row) => row.kind === "changed");
    const added = rows.filter((row) => row.kind === "added");
    expect(changed).toHaveLength(1);
    expect(changed[0]!.fieldPath).toBe("items.0.title");
    expect(added).toHaveLength(1);
    expect(added[0]!.fieldPath).toBe("items.1");
    expect(rows.some((row) => row.kind === "removed")).toBe(false);
  });

  it("pure reorder → single order note", () => {
    const a = { title: "A", body: "aaa" };
    const b = { title: "B", body: "bbb" };
    const rows = computeArrayCollectionDiff(titledFields, [a, b], [b, a]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.fieldPath).toBe("items.order");
  });

  it("reorder + add → added row only, no order note", () => {
    const a = { title: "A", body: "aaa" };
    const b = { title: "B", body: "bbb" };
    const c = { title: "C", body: "ccc" };
    const rows = computeArrayCollectionDiff(titledFields, [a, b], [c, b, a]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("added");
  });

  it("empty arrays", () => {
    const a = { title: "A", body: "aaa" };
    expect(computeArrayCollectionDiff(titledFields, [], [])).toHaveLength(0);
    expect(
      computeArrayCollectionDiff(titledFields, [], [a]).map((row) => row.kind)
    ).toEqual(["added"]);
    expect(
      computeArrayCollectionDiff(titledFields, [a], []).map((row) => row.kind)
    ).toEqual(["removed"]);
  });
});

describe("computeEntryDiff — object list fields (identity, not index)", () => {
  const fields = [
    {
      name: "sections",
      label: "Sections",
      type: "object",
      list: true,
      fields: [
        { name: "heading", label: "Heading", type: "string" },
        { name: "text", label: "Text", type: "text" },
      ],
    },
  ] as unknown as Field[];

  it("insert at front → one added row, no cascade", () => {
    const oldContent = {
      sections: [
        { heading: "One", text: "first" },
        { heading: "Two", text: "second" },
      ],
    };
    const newContent = {
      sections: [
        { heading: "Zero", text: "new" },
        { heading: "One", text: "first" },
        { heading: "Two", text: "second" },
      ],
    };
    const rows = computeEntryDiff(fields, oldContent, newContent);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("added");
    expect(rows[0]!.fieldPath).toBe("sections.0");
  });

  it("remove from middle → one removed row under a non-numeric segment", () => {
    const oldContent = {
      sections: [
        { heading: "One", text: "first" },
        { heading: "Two", text: "second" },
        { heading: "Three", text: "third" },
      ],
    };
    const newContent = {
      sections: [
        { heading: "One", text: "first" },
        { heading: "Three", text: "third" },
      ],
    };
    const rows = computeEntryDiff(fields, oldContent, newContent);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("removed");
    expect(rows[0]!.fieldPath).toBe("sections.removed.0");
  });

  it("edited item rows are keyed by the NEW index (editor badge compat)", () => {
    const oldContent = {
      sections: [
        { heading: "One", text: "first" },
        { heading: "Two", text: "second" },
      ],
    };
    const newContent = {
      sections: [
        { heading: "Zero", text: "brand new" },
        { heading: "One", text: "first" },
        { heading: "Two", text: "second edited" },
      ],
    };
    const rows = computeEntryDiff(fields, oldContent, newContent);
    const changed = rows.find((row) => row.kind === "changed");
    expect(changed?.fieldPath).toBe("sections.2.text");
  });
});

describe("computeEntryDiff — scalar lists (multiset, not index)", () => {
  const fields = [
    { name: "tags", label: "Tags", type: "string", list: true },
  ] as unknown as Field[];

  it("insert at front → one added row", () => {
    const rows = computeEntryDiff(
      fields,
      { tags: ["b", "c"] },
      { tags: ["a", "b", "c"] }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("added");
    expect(rows[0]!.fieldPath).toBe("tags.0");
  });

  it("remove one → one removed row", () => {
    const rows = computeEntryDiff(
      fields,
      { tags: ["a", "b", "c"] },
      { tags: ["a", "c"] }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("removed");
  });

  it("pure reorder → single order note", () => {
    const rows = computeEntryDiff(
      fields,
      { tags: ["a", "b"] },
      { tags: ["b", "a"] }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.fieldPath).toBe("tags.order");
  });
});
