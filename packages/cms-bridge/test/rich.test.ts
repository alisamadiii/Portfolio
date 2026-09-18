// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { hasHtmlEntities, readRich, renderRich } from "../src/rich";

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

  it("preserves authored HTML entities (named / decimal / hex)", () => {
    expect(renderRich("&copy; 2026")).toBe("&copy; 2026");
    expect(renderRich("caf&eacute; &mdash; open")).toBe(
      "caf&eacute; &mdash; open"
    );
    expect(renderRich("&#169; &#xA9; &#XA9;")).toBe("&#169; &#xA9; &#XA9;");
    expect(renderRich("a &nbsp; b")).toBe("a &nbsp; b");
  });

  it("still escapes bare ampersands next to entity-looking text", () => {
    // Bare `&` (space/EOL/non-entity after) → &amp;; real entities untouched.
    expect(renderRich("AT&T & Q&A")).toBe("AT&amp;T &amp; Q&amp;A");
    expect(renderRich("Tom & &copy;")).toBe("Tom &amp; &copy;");
    expect(renderRich("trailing &")).toBe("trailing &amp;");
    // No semicolon → not a valid reference → escaped.
    expect(renderRich("&copy no semi")).toBe("&amp;copy no semi");
  });

  it("keeps entities intact through mark/accent markup", () => {
    expect(renderRich("**caf&eacute;** `&copy;`")).toBe(
      '<span class="cms-mark">caf&eacute;</span> <span class="cms-hl">&copy;</span>'
    );
  });
});

describe("hasHtmlEntities", () => {
  it("detects named, decimal, and hex entities", () => {
    for (const s of ["&copy;", "x &mdash; y", "&#169;", "&#xA9;", "&#XA9;"])
      expect(hasHtmlEntities(s)).toBe(true);
  });

  it("ignores bare ampersands and non-entities", () => {
    for (const s of ["AT&T", "Q&A", "plain text", "trailing &", "&copy no semi"])
      expect(hasHtmlEntities(s)).toBe(false);
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
