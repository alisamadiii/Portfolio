import { describe, expect, it } from "vitest";

import { analyzeSeo, fieldStatus, type SeoInput } from "./index";
import { containsAllWords, containsPhrase, stem } from "./match";
import {
  extractHeadings,
  extractImages,
  extractLinks,
  firstParagraph,
  toPlainText,
} from "./parse";

const baseInput: SeoInput = {
  title: "",
  slug: "",
  description: "",
  keyword: "",
  body: "",
};

const checkById = (result: ReturnType<typeof analyzeSeo>, id: string) =>
  result.checks.find((c) => c.id === id);

// ─── Stemmer / matching ──────────────────────────────────────────

describe("stem", () => {
  it("handles plurals and word forms", () => {
    expect(stem("bottles")).toBe("bottle");
    expect(stem("cities")).toBe("city");
    expect(stem("boxes")).toBe("box");
    expect(stem("running")).toBe("run");
    expect(stem("class")).toBe("class");
    expect(stem("dog's")).toBe("dog");
  });
});

describe("containsPhrase", () => {
  it("matches exact phrases case-insensitively", () => {
    expect(containsPhrase("The Best Hiking Water Bottle", "best hiking water bottle")).toBe(true);
  });

  it("matches word forms (premium)", () => {
    expect(containsPhrase("these hiking water bottles rock", "hiking water bottle")).toBe(true);
  });

  it("requires words in order", () => {
    expect(containsPhrase("water bottle for hiking", "hiking water bottle")).toBe(false);
    expect(containsAllWords("water bottle for hiking", "hiking water bottle")).toBe(true);
  });
});

// ─── Markdown parsing ────────────────────────────────────────────

describe("parse", () => {
  const md = [
    "Intro paragraph about hiking.",
    "",
    "## Why hydration matters",
    "",
    "Some [internal](/blog/other-post) and [external](https://example.com) links.",
    "",
    "![a bottle](https://img.example.com/bottle.jpg)",
    "",
    "### Picking a bottle",
    "",
    "```js",
    "## not a heading",
    "[not a link](https://code.example.com)",
    "```",
    "",
    "More text with [mail](mailto:x@y.z).",
  ].join("\n");

  it("extracts H2/H3 headings, skipping code fences", () => {
    expect(extractHeadings(md)).toEqual(["Why hydration matters", "Picking a bottle"]);
  });

  it("classifies links and ignores images and mailto", () => {
    const links = extractLinks(md);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ href: "/blog/other-post", internal: true });
    expect(links[1]).toMatchObject({ href: "https://example.com", internal: false });
  });

  it("extracts images with alt", () => {
    expect(extractImages(md)).toEqual([
      { alt: "a bottle", src: "https://img.example.com/bottle.jpg" },
    ]);
  });

  it("finds the first real paragraph", () => {
    expect(firstParagraph(md)).toBe("Intro paragraph about hiking.");
    expect(firstParagraph("## Heading first\n\nActual intro.")).toBe("Actual intro.");
  });

  it("strips markdown to plain text", () => {
    expect(toPlainText("**Bold** and [link](/x) and `code`")).toBe("Bold and link and");
  });
});

// ─── Field statuses (inline hints) ───────────────────────────────

describe("fieldStatus.descriptionLength", () => {
  it("maps lengths to traffic lights", () => {
    expect(fieldStatus.descriptionLength("")).toBe("bad");
    expect(fieldStatus.descriptionLength("x".repeat(119))).toBe("ok");
    expect(fieldStatus.descriptionLength("x".repeat(120))).toBe("good");
    expect(fieldStatus.descriptionLength("x".repeat(156))).toBe("good");
    expect(fieldStatus.descriptionLength("x".repeat(157))).toBe("ok");
  });
});

describe("fieldStatus.titleWidth", () => {
  it("maps lengths to traffic lights", () => {
    expect(fieldStatus.titleWidth("")).toBe("bad");
    expect(fieldStatus.titleWidth("short")).toBe("ok");
    expect(fieldStatus.titleWidth("x".repeat(30))).toBe("good");
    expect(fieldStatus.titleWidth("x".repeat(61))).toBe("bad");
  });
});

// ─── Checks ──────────────────────────────────────────────────────

describe("analyzeSeo checks", () => {
  it("reports missing keyphrase and hides keyword-dependent checks", () => {
    const result = analyzeSeo({ ...baseInput, title: "A title", body: "Text." });
    expect(checkById(result, "keyphrase-set")?.status).toBe("bad");
    expect(checkById(result, "keyphrase-in-title")).toBeUndefined();
    expect(checkById(result, "keyphrase-density")).toBeUndefined();
    expect(checkById(result, "synonyms-set")).toBeUndefined();
  });

  it("keyphrase-length boundaries", () => {
    const at = (keyword: string) =>
      checkById(analyzeSeo({ ...baseInput, keyword }), "keyphrase-length")?.status;
    expect(at("one two three four")).toBe("good");
    expect(at("one two three four five")).toBe("ok");
    expect(at("a b c d e f g h i")).toBe("bad");
  });

  it("keyphrase-in-title: start beats middle beats absent", () => {
    const at = (title: string) =>
      checkById(
        analyzeSeo({ ...baseInput, keyword: "water bottle", title }),
        "keyphrase-in-title"
      )?.status;
    expect(at("Water bottles for hiking")).toBe("good");
    expect(at("The best water bottle around")).toBe("ok");
    expect(at("Hydration gear reviewed")).toBe("bad");
  });

  it("matches via synonyms (premium)", () => {
    const result = analyzeSeo({
      ...baseInput,
      keyword: "water bottle",
      synonyms: ["hydration flask"],
      title: "Best hydration flask picks for the trail",
    });
    expect(checkById(result, "keyphrase-in-title")?.status).not.toBe("bad");
    expect(checkById(result, "synonyms-set")?.status).toBe("good");
  });

  it("keyphrase-in-slug: more than half the words counts as good", () => {
    const at = (slug: string, keyword = "water bottle") =>
      checkById(
        analyzeSeo({ ...baseInput, keyword, slug }),
        "keyphrase-in-slug"
      )?.status;
    expect(at("best-water-bottle")).toBe("good");
    expect(at("hydration-guide")).toBe("ok");
    expect(at("water-bottle-guide", "best hiking water bottle")).toBe("ok");
    expect(at("best-water-bottle", "best hiking water bottle")).toBe("good");
  });

  it("keyphrase-in-meta: variant good, verbatim echo flagged, absent bad", () => {
    const at = (description: string) =>
      checkById(
        analyzeSeo({ ...baseInput, keyword: "water bottle", description }),
        "keyphrase-in-meta"
      )?.status;
    expect(at("Which bottles hold water best on the trail.")).toBe("good");
    expect(at("The best water bottle for every hike.")).toBe("ok");
    expect(at("Hydration gear for long trails.")).toBe("bad");
  });

  it("no-h1-in-body only fires on violation", () => {
    const clean = analyzeSeo({ ...baseInput, body: "## Fine heading\n\nText." });
    expect(checkById(clean, "no-h1-in-body")).toBeUndefined();
    const violating = analyzeSeo({ ...baseInput, body: "# Rogue H1\n\nText." });
    expect(checkById(violating, "no-h1-in-body")?.status).toBe("bad");
  });

  it("keyphrase-in-intro and subheadings", () => {
    const body = [
      "A water bottle is essential.",
      "",
      "## Choosing a water bottle",
      "",
      "## Care tips",
      "",
      "Text.",
    ].join("\n");
    const result = analyzeSeo({ ...baseInput, keyword: "water bottle", body });
    expect(checkById(result, "keyphrase-in-intro")?.status).toBe("good");
    expect(checkById(result, "keyphrase-in-subheadings")?.status).toBe("good");
  });

  it("keyphrase-density: zero occurrences is a problem", () => {
    const result = analyzeSeo({
      ...baseInput,
      keyword: "quantum computing",
      body: "A short text about something else entirely, repeated words words.",
    });
    expect(checkById(result, "keyphrase-density")?.status).toBe("bad");
  });

  it("text-length boundaries", () => {
    const at = (words: number) =>
      checkById(
        analyzeSeo({ ...baseInput, body: Array(words).fill("word").join(" ") }),
        "text-length"
      )?.status;
    expect(at(299)).toBe("bad");
    expect(at(300)).toBe("ok");
    expect(at(900)).toBe("good");
  });

  it("internal links target 2–4; outbound needs 1", () => {
    const result = analyzeSeo({
      ...baseInput,
      body: "See [a](/blog/a), [b](/blog/b) and [that](https://x.com).",
    });
    expect(checkById(result, "internal-links")?.status).toBe("good");
    expect(checkById(result, "outbound-links")?.status).toBe("good");

    const single = analyzeSeo({ ...baseInput, body: "See [a](/blog/a)." });
    expect(checkById(single, "internal-links")?.status).toBe("ok");

    const none = analyzeSeo({ ...baseInput, body: "No links here." });
    expect(checkById(none, "internal-links")?.status).toBe("ok");
    expect(checkById(none, "outbound-links")?.status).toBe("ok");
  });

  it("images: hero counts, none is a problem", () => {
    expect(checkById(analyzeSeo(baseInput), "images")?.status).toBe("bad");
    expect(
      checkById(
        analyzeSeo({ ...baseInput, heroImage: "https://x.com/a.jpg" }),
        "images"
      )?.status
    ).toBe("good");
  });

  it("image-alt-keyphrase uses hero alt", () => {
    const result = analyzeSeo({
      ...baseInput,
      keyword: "water bottle",
      heroImage: "https://x.com/a.jpg",
      heroImageAlt: "a steel water bottle on a rock",
    });
    expect(checkById(result, "image-alt-keyphrase")?.status).toBe("good");
    expect(checkById(result, "hero-image")?.status).toBe("good");
  });

  it("keyphrase-unique flags reuse", () => {
    const at = (otherKeywords: string[]) =>
      checkById(
        analyzeSeo({ ...baseInput, keyword: "Water Bottle", otherKeywords }),
        "keyphrase-unique"
      )?.status;
    expect(at(["water bottle"])).toBe("bad");
    expect(at(["hiking boots"])).toBe("good");
  });

  it("keyphrase-distribution needs 300+ words, rates spread", () => {
    const short = analyzeSeo({ ...baseInput, keyword: "bottle", body: "bottle text" });
    expect(checkById(short, "keyphrase-distribution")).toBeUndefined();

    const chunk = Array(80).fill("word").join(" ");
    const even = [1, 2, 3, 4].map(() => `bottle ${chunk}`).join(" ");
    expect(
      checkById(
        analyzeSeo({ ...baseInput, keyword: "bottle", body: even }),
        "keyphrase-distribution"
      )?.status
    ).toBe("good");

    const lumped = `bottle ${Array(320).fill("word").join(" ")}`;
    expect(
      checkById(
        analyzeSeo({ ...baseInput, keyword: "bottle", body: lumped }),
        "keyphrase-distribution"
      )?.status
    ).toBe("bad");
  });

  it("related keyphrases get per-phrase checks (premium)", () => {
    const result = analyzeSeo({
      ...baseInput,
      keyword: "water bottle",
      relatedKeywords: ["insulated flask", "bpa free"],
      body: "An insulated flask keeps drinks cold.",
    });
    expect(checkById(result, "related-keyphrase:insulated flask")?.status).toBe("good");
    expect(checkById(result, "related-keyphrase:bpa free")?.status).toBe("ok");
  });
});

// ─── Link suggestions (premium) ──────────────────────────────────

describe("linkSuggestions", () => {
  const otherPosts = [
    { title: "Hiking boots guide", slug: "hiking-boots-guide", keyword: "hiking boots" },
    { title: "Trail mix recipes", slug: "trail-mix-recipes", keyword: "trail mix" },
  ];

  it("suggests unlinked posts whose keyword appears in the body", () => {
    const result = analyzeSeo({
      ...baseInput,
      body: "Pair your bottle with good hiking boots.",
      otherPosts,
    });
    expect(result.linkSuggestions).toEqual([
      { title: "Hiking boots guide", slug: "hiking-boots-guide" },
    ]);
  });

  it("skips posts already linked", () => {
    const result = analyzeSeo({
      ...baseInput,
      body: "Get [hiking boots](/blog/hiking-boots-guide) — hiking boots matter.",
      otherPosts,
    });
    expect(result.linkSuggestions).toEqual([]);
  });
});

// ─── Scoring / options ───────────────────────────────────────────

describe("scoring and options", () => {
  it("a well-optimized post scores green", () => {
    const chunk = (n: number) => Array(n).fill("solid useful advice").join(" ");
    const body = [
      "The best hiking water bottle keeps you hydrated on long trails.",
      "",
      `${chunk(80)} best hiking water bottles ${chunk(80)}`,
      "",
      "## Choosing a hiking water bottle",
      "",
      `${chunk(80)} best hiking water bottle ${chunk(80)}`,
      "",
      "## Care and cleaning",
      "",
      "Any best hiking water bottle here will serve you well — see our [boots guide](/blog/boots), [trail snacks](/blog/snacks) and [this study](https://example.org).",
      "",
      "![best hiking water bottle on a rock](https://img.example.com/b.jpg)",
    ].join("\n");
    const result = analyzeSeo({
      title: "Best hiking water bottle: 2026 field-tested picks",
      slug: "best-hiking-water-bottle",
      description:
        "The best bottles from our Florida hiking field tests — which water carriers survive day hikes, thru-hikes, and hot-weather trips.",
      keyword: "best hiking water bottle",
      body,
      heroImage: "https://img.example.com/hero.jpg",
      heroImageAlt: "best hiking water bottle lineup",
      synonyms: ["trail water bottle"],
      otherKeywords: ["hiking boots"],
    });
    expect(result.problems).toEqual([]);
    expect(result.rating).toBe("good");
    expect(result.score).toBeGreaterThanOrEqual(71);
  });

  it("an empty post scores red", () => {
    const result = analyzeSeo(baseInput);
    expect(result.rating).toBe("bad");
  });

  it("custom checks run and disable works", () => {
    const result = analyzeSeo(
      { ...baseInput, title: "A perfectly reasonable post title here" },
      {
        disable: ["images", "keyphrase-set"],
        checks: [
          {
            id: "custom-no-emoji",
            run: (ctx) =>
              /\p{Extended_Pictographic}/u.test(ctx.input.title)
                ? { id: "custom-no-emoji", status: "bad", score: 2, text: "Emoji in title." }
                : { id: "custom-no-emoji", status: "good", score: 9, text: "No emoji in title." },
          },
        ],
      }
    );
    expect(checkById(result, "images")).toBeUndefined();
    expect(checkById(result, "keyphrase-set")).toBeUndefined();
    expect(checkById(result, "custom-no-emoji")?.status).toBe("good");
  });

  it("threshold overrides apply", () => {
    const result = analyzeSeo(
      { ...baseInput, body: Array(150).fill("word").join(" ") },
      { thresholds: { textLengthMin: 100, textLengthGood: 200 } }
    );
    expect(checkById(result, "text-length")?.status).toBe("ok");
  });
});
