import { describe, expect, it } from "vitest";

import {
  applyInsert,
  findTrigger,
  firstName,
  matchPlaceholders,
  PLACEHOLDERS,
  resolveTemplate,
} from "@workspace/trpc/lib/templates-shared";

describe("resolveTemplate", () => {
  it("fills placeholders, ignoring case and extra spaces", () => {
    const { text, missing } = resolveTemplate("Hi [[Lead  Name]], see you [[ meeting date ]]", {
      "lead name": "Sarah",
      "meeting date": "Friday",
    });
    expect(text).toBe("Hi Sarah, see you Friday");
    expect(missing).toEqual([]);
  });

  it("keeps unknown and empty placeholders as typed and reports them", () => {
    const { text, missing } = resolveTemplate("[[business phone]] [[nope]]", { "business phone": "  " });
    expect(text).toBe("[[business phone]] [[nope]]");
    expect(missing).toEqual(["business phone", "nope"]);
  });

  it("every placeholder key resolves", () => {
    for (const p of PLACEHOLDERS) {
      expect(resolveTemplate(`[[${p.key}]]`, { [p.key]: "x" }).text).toBe("x");
    }
  });

  it("firstName takes the first word", () => {
    expect(firstName("  Sarah J. Smith")).toBe("Sarah");
    expect(firstName(null)).toBe("");
  });
});

describe("findTrigger", () => {
  it("opens snippets on / at the start or after a space", () => {
    expect(findTrigger("/than", 5)).toEqual({ kind: "slash", start: 0, query: "than" });
    expect(findTrigger("Hello /fol", 10)).toEqual({ kind: "slash", start: 6, query: "fol" });
    expect(findTrigger("line\n/x", 7)).toEqual({ kind: "slash", start: 5, query: "x" });
  });

  it("ignores / inside a word or a URL", () => {
    expect(findTrigger("and/or", 6)).toBeNull();
    expect(findTrigger("https://acme.com/a", 18)).toBeNull();
  });

  it("opens placeholders on an unclosed [[ and not on a closed one", () => {
    expect(findTrigger("Hi [[lead", 9)).toEqual({ kind: "placeholder", start: 3, query: "lead" });
    expect(findTrigger("Hi [[lead name]] ", 17)).toBeNull();
  });

  it("only looks before the caret", () => {
    expect(findTrigger("/abc rest", 4)).toEqual({ kind: "slash", start: 0, query: "abc" });
    expect(findTrigger("/abc rest", 9)).toBeNull();
  });
});

describe("applyInsert", () => {
  it("replaces only the trigger and puts the caret after the insert", () => {
    const text = "Hi /tha and more";
    const trigger = findTrigger(text, 7)!;
    expect(applyInsert(text, trigger, 7, "Thanks!")).toEqual({ text: "Hi Thanks! and more", caret: 10 });
  });

  it("matchPlaceholders filters by what's typed", () => {
    expect(matchPlaceholders("bus").every((p) => p.key.includes("bus"))).toBe(true);
    expect(matchPlaceholders("").length).toBe(PLACEHOLDERS.length);
  });
});
