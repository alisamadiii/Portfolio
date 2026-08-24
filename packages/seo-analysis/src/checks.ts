import { containsPhrase, stems, tokenize } from "./match";
import { check, type SeoCheckDefinition } from "./types";

// ─── Free-tier checks ────────────────────────────────────────────

const keyphraseSet: SeoCheckDefinition = {
  id: "keyphrase-set",
  run: (ctx) =>
    ctx.hasKeyword
      ? check("keyphrase-set", "good", "Focus keyphrase: set. Good job!")
      : check(
          "keyphrase-set",
          "bad",
          "No focus keyphrase set. Pick the search term this post should rank for."
        ),
};

const keyphraseLength: SeoCheckDefinition = {
  id: "keyphrase-length",
  run: (ctx) => {
    if (!ctx.hasKeyword) return null;
    const words = tokenize(ctx.input.keyword).length;
    const { keyphraseGoodWords, keyphraseOkWords } = ctx.thresholds;
    if (words <= keyphraseGoodWords)
      return check(
        "keyphrase-length",
        "good",
        `Keyphrase length: ${words} word${words === 1 ? "" : "s"}. Good job!`
      );
    if (words <= keyphraseOkWords)
      return check(
        "keyphrase-length",
        "ok",
        `Keyphrase length: ${words} words is longer than the recommended maximum of ${keyphraseGoodWords}. Make it more focused.`
      );
    return check(
      "keyphrase-length",
      "bad",
      `Keyphrase length: ${words} words is way over the recommended maximum of ${keyphraseGoodWords}. Make it shorter and more focused.`
    );
  },
};

const keyphraseInTitle: SeoCheckDefinition = {
  id: "keyphrase-in-title",
  run: (ctx) => {
    if (!ctx.hasKeyword) return null;
    const title = ctx.input.title;
    if (!title.trim()) return null;
    if (ctx.matches(title)) {
      const titleStems = stems(title);
      const keywordStems = stems(ctx.input.keyword);
      const atStart = keywordStems.every((s, i) => titleStems[i] === s);
      return atStart
        ? check(
            "keyphrase-in-title",
            "good",
            "Keyphrase in SEO title: the exact match appears at the beginning of the title. Good job!"
          )
        : check(
            "keyphrase-in-title",
            "ok",
            "Keyphrase in SEO title: the keyphrase appears in the title, but not at the beginning. Move it to the front for the strongest signal."
          );
    }
    if (ctx.matchesAllWords(title))
      return check(
        "keyphrase-in-title",
        "ok",
        "Keyphrase in SEO title: all keyphrase words appear in the title, but not as an exact match. Try using the exact keyphrase."
      );
    return check(
      "keyphrase-in-title",
      "bad",
      "Keyphrase in SEO title: not found. Add your keyphrase to the title, preferably at the beginning."
    );
  },
};

const titleWidth: SeoCheckDefinition = {
  id: "title-width",
  run: (ctx) => {
    const length = ctx.input.title.trim().length;
    const { titleWidthMin, titleWidthMax } = ctx.thresholds;
    if (length === 0)
      return check("title-width", "bad", "SEO title width: no title set.");
    if (length > titleWidthMax)
      return check(
        "title-width",
        "bad",
        `SEO title width: ${length} characters is over the ${titleWidthMax}-character limit — Google will cut it off.`
      );
    if (length < titleWidthMin)
      return check(
        "title-width",
        "ok",
        `SEO title width: ${length} characters is on the short side. Use the space up to ${titleWidthMax} characters.`
      );
    return check(
      "title-width",
      "good",
      `SEO title width: ${length} characters. Good job!`
    );
  },
};

const metaDescriptionLength: SeoCheckDefinition = {
  id: "meta-description-length",
  run: (ctx) => {
    const length = ctx.input.description.trim().length;
    const { descriptionMin, descriptionMax } = ctx.thresholds;
    if (length === 0)
      return check(
        "meta-description-length",
        "bad",
        "Meta description length: no meta description set. Search engines will improvise one — write your own."
      );
    if (length < descriptionMin)
      return check(
        "meta-description-length",
        "ok",
        `Meta description length: ${length} characters is under the ${descriptionMin}-character minimum. Use the space to sell the click.`
      );
    if (length > descriptionMax)
      return check(
        "meta-description-length",
        "ok",
        `Meta description length: ${length} characters is over the ${descriptionMax}-character limit — Google will cut it off.`
      );
    return check(
      "meta-description-length",
      "good",
      `Meta description length: ${length} characters. Well done!`
    );
  },
};

// House rule (agency-blog 3a): the exact keyphrase belongs in the TITLE only —
// the meta paraphrases. A close variant / the keyphrase words in different
// order is the ideal; a verbatim echo gets flagged.
const keyphraseInMeta: SeoCheckDefinition = {
  id: "keyphrase-in-meta",
  run: (ctx) => {
    if (!ctx.hasKeyword || !ctx.input.description.trim()) return null;
    if (containsPhrase(ctx.input.description, ctx.input.keyword))
      return check(
        "keyphrase-in-meta",
        "ok",
        "Keyphrase in meta description: the meta repeats the exact keyphrase. The exact phrase belongs in the title only — paraphrase the meta."
      );
    if (ctx.matchesAllWords(ctx.input.description))
      return check(
        "keyphrase-in-meta",
        "good",
        "Keyphrase in meta description: a close variant appears without echoing the title. Well done!"
      );
    return check(
      "keyphrase-in-meta",
      "bad",
      "Keyphrase in meta description: not found. Work a natural variant of the keyphrase into the description (not the exact phrase — that stays in the title)."
    );
  },
};

// A trimmed natural form beats the full stuffed string (agency-blog slug
// rule), so more than half of the keyphrase words is already "good".
const keyphraseInSlug: SeoCheckDefinition = {
  id: "keyphrase-in-slug",
  run: (ctx) => {
    if (!ctx.hasKeyword || !ctx.input.slug.trim()) return null;
    const slugStems = new Set(stems(ctx.input.slug.replace(/-/g, " ")));
    const keywordStems = stems(ctx.input.keyword);
    if (keywordStems.length === 0) return null;
    const present = keywordStems.filter((s) => slugStems.has(s)).length;
    if (present / keywordStems.length > 0.5)
      return check(
        "keyphrase-in-slug",
        "good",
        "Keyphrase in slug: more than half of your keyphrase appears in the slug. That's great!"
      );
    return check(
      "keyphrase-in-slug",
      "ok",
      "Keyphrase in slug: (most of) the keyphrase is missing from the slug. Use a short natural form of it — no need to stuff the full string."
    );
  },
};

const keyphraseInIntro: SeoCheckDefinition = {
  id: "keyphrase-in-intro",
  run: (ctx) => {
    if (!ctx.hasKeyword || !ctx.firstParagraph) return null;
    if (ctx.matches(ctx.firstParagraph))
      return check(
        "keyphrase-in-intro",
        "good",
        "Keyphrase in introduction: appears in the first paragraph. Well done!"
      );
    if (ctx.matchesAllWords(ctx.firstParagraph))
      return check(
        "keyphrase-in-intro",
        "ok",
        "Keyphrase in introduction: the words appear in the first paragraph, but not as an exact match. Get to the point."
      );
    return check(
      "keyphrase-in-intro",
      "bad",
      "Keyphrase in introduction: not found in the first paragraph. Make the topic clear immediately."
    );
  },
};

const keyphraseInSubheadings: SeoCheckDefinition = {
  id: "keyphrase-in-subheadings",
  run: (ctx) => {
    if (!ctx.hasKeyword || ctx.headings.length === 0) return null;
    const matching = ctx.headings.filter((h) => ctx.matchesAllWords(h)).length;
    const ratio = matching / ctx.headings.length;
    if (matching === 0)
      return check(
        "keyphrase-in-subheadings",
        "ok",
        `Keyphrase in subheadings: none of your ${ctx.headings.length} H2/H3 subheadings reflect the keyphrase. Use it in at least one.`
      );
    if (ratio > ctx.thresholds.subheadingMaxRatio)
      return check(
        "keyphrase-in-subheadings",
        "ok",
        `Keyphrase in subheadings: ${matching} of ${ctx.headings.length} subheadings use the keyphrase — that reads as stuffing. Vary them.`
      );
    return check(
      "keyphrase-in-subheadings",
      "good",
      `Keyphrase in subheadings: ${matching} of your ${ctx.headings.length} H2/H3 subheadings reflect the topic of your copy. Good job!`
    );
  },
};

const keyphraseDensity: SeoCheckDefinition = {
  id: "keyphrase-density",
  run: (ctx) => {
    if (!ctx.hasKeyword || ctx.wordCount === 0) return null;
    const occurrences = ctx.countMatches(ctx.plainText);
    const keywordWords = Math.max(1, tokenize(ctx.input.keyword).length);
    const density = ((occurrences * keywordWords) / ctx.wordCount) * 100;
    const rounded = Math.round(density * 10) / 10;
    const { densityMin, densityMax } = ctx.thresholds;
    if (occurrences === 0)
      return check(
        "keyphrase-density",
        "bad",
        "Keyphrase density: the keyphrase was found 0 times in the text. Use it, or pick a keyphrase that matches what you wrote."
      );
    if (density > densityMax)
      return check(
        "keyphrase-density",
        "bad",
        `Keyphrase density: ${rounded}% is over the ${densityMax}% maximum (found ${occurrences} times) — that reads as stuffing.`
      );
    if (density < densityMin)
      return check(
        "keyphrase-density",
        "ok",
        `Keyphrase density: ${rounded}% is low (found ${occurrences} time${occurrences === 1 ? "" : "s"}). Use the keyphrase more often.`
      );
    return check(
      "keyphrase-density",
      "good",
      `Keyphrase density: the keyphrase was found ${occurrences} times. This is great!`
    );
  },
};

// The frontmatter title renders the page's single H1 — the body must start at
// H2 (agency-blog heading hierarchy rule). Only surfaces on violation.
const noH1InBody: SeoCheckDefinition = {
  id: "no-h1-in-body",
  run: (ctx) =>
    /^#\s/m.test(ctx.input.body.replace(/```[\s\S]*?```/g, ""))
      ? check(
          "no-h1-in-body",
          "bad",
          "Heading hierarchy: the body contains an H1 (# heading). The post title is the only H1 — start body headings at H2 (##)."
        )
      : null,
};

const textLength: SeoCheckDefinition = {
  id: "text-length",
  run: (ctx) => {
    const words = ctx.wordCount;
    const { textLengthGood, textLengthMin } = ctx.thresholds;
    if (words >= textLengthGood)
      return check(
        "text-length",
        "good",
        `Text length: the text contains ${words} words. Good job!`
      );
    if (words >= textLengthMin)
      return check(
        "text-length",
        "ok",
        `Text length: ${words} words. That clears the ${textLengthMin}-word minimum, but ${textLengthGood}+ ranks better for competitive topics.`
      );
    return check(
      "text-length",
      "bad",
      `Text length: ${words} words is below the recommended minimum of ${textLengthMin}. Add more (useful) content.`
    );
  },
};

// House target is 2–4 internal links per post (agency-blog 3b.8).
const internalLinks: SeoCheckDefinition = {
  id: "internal-links",
  run: (ctx) => {
    const count = ctx.links.filter((l) => l.internal).length;
    if (count >= 2)
      return check(
        "internal-links",
        "good",
        `Internal links: you have ${count} internal links. Good job!`
      );
    if (count === 1)
      return check(
        "internal-links",
        "ok",
        "Internal links: only 1 internal link. Aim for 2–4 links to related pages on your site."
      );
    return check(
      "internal-links",
      "ok",
      "Internal links: no internal links appear in this post. Add 2–4 links to related pages (use relative URLs like /blog/…)."
    );
  },
};

const outboundLinks: SeoCheckDefinition = {
  id: "outbound-links",
  run: (ctx) => {
    const count = ctx.links.filter((l) => !l.internal).length;
    return count > 0
      ? check(
          "outbound-links",
          "good",
          `Outbound links: you have ${count} outbound link${count === 1 ? "" : "s"}. Good job!`
        )
      : check(
          "outbound-links",
          "ok",
          "Outbound links: no outbound links appear in this post. Link to a credible source."
        );
  },
};

const images: SeoCheckDefinition = {
  id: "images",
  run: (ctx) => {
    const hasHero = !!ctx.input.heroImage?.trim();
    if (ctx.images.length > 0 || hasHero)
      return check("images", "good", "Images: images appear in this post. Good job!");
    return check(
      "images",
      "bad",
      "Images: no images appear in this post. Add at least one — posts with images rank and share better."
    );
  },
};

const imageAltKeyphrase: SeoCheckDefinition = {
  id: "image-alt-keyphrase",
  run: (ctx) => {
    if (!ctx.hasKeyword) return null;
    const alts = [
      ...(ctx.input.heroImageAlt?.trim() ? [ctx.input.heroImageAlt.trim()] : []),
      ...ctx.images.map((img) => img.alt).filter(Boolean),
    ];
    const totalImages =
      ctx.images.length + (ctx.input.heroImage?.trim() ? 1 : 0);
    if (totalImages === 0) return null;
    if (alts.length === 0)
      return check(
        "image-alt-keyphrase",
        "bad",
        "Image alt attributes: none of your images have alt text. Add alt text that includes the keyphrase."
      );
    if (alts.some((alt) => ctx.matchesAllWords(alt)))
      return check(
        "image-alt-keyphrase",
        "good",
        "Image alt attributes: an image alt reflects the keyphrase. Good job!"
      );
    return check(
      "image-alt-keyphrase",
      "ok",
      "Image alt attributes: your images have alt text, but none of it reflects the keyphrase. Work it into one."
    );
  },
};

const heroImage: SeoCheckDefinition = {
  id: "hero-image",
  run: (ctx) => {
    const hasHero = !!ctx.input.heroImage?.trim();
    const hasAlt = !!ctx.input.heroImageAlt?.trim();
    if (hasHero && hasAlt)
      return check(
        "hero-image",
        "good",
        "Banner image: set, with alt text. Good job!"
      );
    if (hasHero)
      return check(
        "hero-image",
        "ok",
        "Banner image: set, but missing alt text. Add it for accessibility and image search."
      );
    return check(
      "hero-image",
      "ok",
      "Banner image: not set. Posts without a banner look bare in listings and social shares."
    );
  },
};

const keyphraseUnique: SeoCheckDefinition = {
  id: "keyphrase-unique",
  run: (ctx) => {
    if (!ctx.hasKeyword) return null;
    const mine = ctx.input.keyword.trim().toLowerCase();
    const used = (ctx.input.otherKeywords ?? []).some(
      (other) => other.trim().toLowerCase() === mine
    );
    return used
      ? check(
          "keyphrase-unique",
          "bad",
          "Previously used keyphrase: another post already targets this keyphrase — they'll compete against each other. Pick a different angle."
        )
      : check(
          "keyphrase-unique",
          "good",
          "Previously used keyphrase: you've not used this keyphrase before. Very good!"
        );
  },
};

// ─── Premium checks ──────────────────────────────────────────────

const keyphraseDistribution: SeoCheckDefinition = {
  id: "keyphrase-distribution",
  run: (ctx) => {
    if (!ctx.hasKeyword || ctx.wordCount < ctx.thresholds.textLengthMin)
      return null;
    const hits = ctx.quarters.filter((q) => ctx.matches(q)).length;
    if (hits === 4)
      return check(
        "keyphrase-distribution",
        "good",
        "Keyphrase distribution: evenly distributed throughout the text. Good job!"
      );
    if (hits >= 2)
      return check(
        "keyphrase-distribution",
        "ok",
        "Keyphrase distribution: somewhat uneven. Spread the keyphrase more evenly throughout the whole text."
      );
    return check(
      "keyphrase-distribution",
      "bad",
      "Keyphrase distribution: very uneven — large parts of the text never mention the keyphrase. Distribute it throughout."
    );
  },
};

const synonymsSet: SeoCheckDefinition = {
  id: "synonyms-set",
  run: (ctx) => {
    if (!ctx.hasKeyword) return null;
    const count = (ctx.input.synonyms ?? []).filter((s) => s.trim()).length;
    return count > 0
      ? check(
          "synonyms-set",
          "good",
          `Keyphrase synonyms: ${count} synonym${count === 1 ? "" : "s"} set — they count as keyphrase matches. Good job!`
        )
      : check(
          "synonyms-set",
          "ok",
          "Keyphrase synonyms: none set. Add synonyms so natural variations of your keyphrase count as matches."
        );
  },
};

export const relatedKeyphraseChecks = (
  ctx: Parameters<SeoCheckDefinition["run"]>[0]
): ReturnType<SeoCheckDefinition["run"]>[] =>
  (ctx.input.relatedKeywords ?? [])
    .map((kw) => kw.trim())
    .filter(Boolean)
    .map((kw) =>
      containsPhrase(ctx.plainText, kw)
        ? check(
            `related-keyphrase:${kw}`,
            "good",
            `Related keyphrase "${kw}": found in the text. Well done!`
          )
        : check(
            `related-keyphrase:${kw}`,
            "ok",
            `Related keyphrase "${kw}": not found in the text. Cover it, or drop it.`
          )
    );

export const BUILT_IN_CHECKS: SeoCheckDefinition[] = [
  keyphraseSet,
  keyphraseLength,
  keyphraseInTitle,
  titleWidth,
  metaDescriptionLength,
  keyphraseInMeta,
  keyphraseInSlug,
  keyphraseInIntro,
  keyphraseInSubheadings,
  keyphraseDensity,
  keyphraseDistribution,
  noH1InBody,
  textLength,
  internalLinks,
  outboundLinks,
  images,
  imageAltKeyphrase,
  heroImage,
  keyphraseUnique,
  synonymsSet,
];
