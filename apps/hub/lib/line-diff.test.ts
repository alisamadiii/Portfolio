import { describe, expect, it } from "vitest";

import { collapseContext, computeLineDiff, toJsonLines } from "./line-diff";

describe("toJsonLines", () => {
  it("pretty-prints objects with 2-space indent", () => {
    expect(toJsonLines({ a: 1 })).toEqual(["{", '  "a": 1', "}"]);
  });

  it("empty values → no lines", () => {
    expect(toJsonLines(undefined)).toEqual([]);
    expect(toJsonLines(null)).toEqual([]);
    expect(toJsonLines("")).toEqual([]);
  });

  it("multiline strings split into lines", () => {
    expect(toJsonLines("a\nb")).toEqual(["a", "b"]);
  });
});

describe("computeLineDiff", () => {
  it("identical → all context", () => {
    const lines = computeLineDiff(["a", "b"], ["a", "b"]);
    expect(lines.every((line) => line.type === "context")).toBe(true);
  });

  it("added value → all add lines", () => {
    const lines = computeLineDiff([], ["a", "b"]);
    expect(lines).toEqual([
      { type: "add", text: "a" },
      { type: "add", text: "b" },
    ]);
  });

  it("one changed line → del + add, rest context", () => {
    const lines = computeLineDiff(["a", "b", "c"], ["a", "x", "c"]);
    expect(lines).toEqual([
      { type: "context", text: "a" },
      { type: "del", text: "b" },
      { type: "add", text: "x" },
      { type: "context", text: "c" },
    ]);
  });

  it("oversized input falls back to whole-block del/add", () => {
    const oldLines = Array.from({ length: 600 }, (_, i) => `o${i}`);
    const newLines = Array.from({ length: 600 }, (_, i) => `n${i}`);
    const lines = computeLineDiff(oldLines, newLines);
    expect(lines).toHaveLength(1200);
    expect(lines[0]!.type).toBe("del");
    expect(lines[1199]!.type).toBe("add");
  });
});

describe("collapseContext", () => {
  it("collapses long unchanged runs to a gap, keeps 2 context lines", () => {
    const lines = computeLineDiff(
      ["a", "b", "c", "d", "e", "f", "g", "h"],
      ["a", "b", "c", "d", "e", "f", "g", "X"]
    );
    const collapsed = collapseContext(lines);
    expect(collapsed[0]).toEqual({ type: "gap", hidden: 5 });
    expect(collapsed.slice(1)).toEqual([
      { type: "context", text: "f" },
      { type: "context", text: "g" },
      { type: "del", text: "h" },
      { type: "add", text: "X" },
    ]);
  });

  it("no changes → everything collapses into one gap", () => {
    const collapsed = collapseContext(computeLineDiff(["a", "b"], ["a", "b"]));
    expect(collapsed).toEqual([{ type: "gap", hidden: 2 }]);
  });

  it("short context runs stay visible", () => {
    const collapsed = collapseContext(
      computeLineDiff(["a", "b", "c"], ["a", "x", "c"])
    );
    expect(collapsed.some((line) => line.type === "gap")).toBe(false);
  });
});
