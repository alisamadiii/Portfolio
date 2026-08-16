// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { readRich, renderRich } from "../src/rich";

const roundTrip = (source: string): string => {
  const host = document.createElement("p");
  host.innerHTML = renderRich(source);
  return readRich(host);
};

describe("renderRich", () => {
  it("renders **mark** as a cms-mark span", () => {
    expect(renderRich("Wood-fired **pasta**, nightly")).toBe(
      'Wood-fired <span class="cms-mark">pasta</span>, nightly'
    );
  });

  it("appends markClass to the mark span", () => {
    expect(renderRich("**a**", { markClass: "text-brand-600 italic" })).toBe(
      '<span class="cms-mark text-brand-600 italic">a</span>'
    );
  });

  it("applies markStyle to the mark span", () => {
    expect(renderRich("**a**", { markStyle: "color:red" })).toBe(
      '<span class="cms-mark" style="color:red">a</span>'
    );
  });

  it("renders `accent` as a cms-hl span", () => {
    expect(renderRich("OMG `Food`")).toBe(
      'OMG <span class="cms-hl">Food</span>'
    );
  });

  it("supports mark and accent in one string", () => {
    expect(renderRich("**Big** and `bright`")).toBe(
      '<span class="cms-mark">Big</span> and <span class="cms-hl">bright</span>'
    );
  });

  it("escapes HTML before applying markup", () => {
    expect(renderRich("a < b & **c**")).toBe(
      'a &lt; b &amp; <span class="cms-mark">c</span>'
    );
  });
});

describe("readRich round-trip", () => {
  it("preserves mark source", () => {
    expect(roundTrip("Wood-fired **pasta**, nightly")).toBe(
      "Wood-fired **pasta**, nightly"
    );
  });

  it("preserves mark source with a markClass", () => {
    const host = document.createElement("h1");
    host.innerHTML = renderRich("OMG **Food**", { markClass: "text-brand-600" });
    expect(readRich(host)).toBe("OMG **Food**");
  });

  it("preserves accent source", () => {
    expect(roundTrip("OMG `Food`")).toBe("OMG `Food`");
  });

  it("preserves mixed source", () => {
    expect(roundTrip("**Big** and `bright` day")).toBe(
      "**Big** and `bright` day"
    );
  });

  it("flattens authored <strong> markup to ** source (back-compat)", () => {
    const host = document.createElement("h1");
    host.innerHTML = "Wood-fired <strong>pasta</strong>";
    expect(readRich(host)).toBe("Wood-fired **pasta**");
  });
});
