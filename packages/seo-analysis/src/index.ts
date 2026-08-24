// @alisamadiillc/seo-analysis — Yoast-style SEO analysis, headless and
// zero-dependency. Feed analyzeSeo() the post's fields; it returns problems,
// improvements, good results, and a 0–100 traffic-light score. Works in any
// project (hub, client admin pages, Node scripts) and is extensible with
// custom checks via SeoOptions.checks.

import { BUILT_IN_CHECKS, relatedKeyphraseChecks } from "./checks";
import {
  containsAllWords,
  containsPhrase,
  phraseOccurrences,
  stems,
  tokenize,
} from "./match";
import {
  extractHeadings,
  extractImages,
  extractLinks,
  firstParagraph,
  toPlainText,
} from "./parse";
import {
  DEFAULT_THRESHOLDS,
  type SeoCheck,
  type SeoCheckStatus,
  type SeoContext,
  type SeoInput,
  type SeoLinkSuggestion,
  type SeoOptions,
  type SeoRating,
  type SeoResult,
  type SeoThresholds,
} from "./types";

export type {
  SeoCheck,
  SeoCheckDefinition,
  SeoCheckStatus,
  SeoContext,
  SeoInput,
  SeoLinkSuggestion,
  SeoOptions,
  SeoRating,
  SeoResult,
  SeoThresholds,
} from "./types";
export { check, DEFAULT_THRESHOLDS, STATUS_POINTS } from "./types";
export type { SeoImage, SeoLink } from "./parse";

const ratingFor = (score: number): SeoRating =>
  score >= 71 ? "good" : score >= 41 ? "ok" : "bad";

const buildContext = (input: SeoInput, thresholds: SeoThresholds): SeoContext => {
  const plainText = toPlainText(input.body);
  const textStems = stems(plainText);
  const wordCount = tokenize(plainText).length;

  const phrases = [input.keyword, ...(input.synonyms ?? [])]
    .map((p) => p.trim())
    .filter(Boolean);
  const phraseStemLists = phrases.map((p) => stems(p));

  const quarterSize = Math.ceil(Math.max(1, wordCount) / 4);
  const plainWords = plainText.split(/\s+/).filter(Boolean);
  const quarters = [0, 1, 2, 3].map((i) =>
    plainWords.slice(i * quarterSize, (i + 1) * quarterSize).join(" ")
  );

  return {
    input,
    thresholds,
    plainText,
    wordCount,
    headings: extractHeadings(input.body),
    links: extractLinks(input.body),
    images: extractImages(input.body),
    firstParagraph: firstParagraph(input.body),
    quarters,
    hasKeyword: !!input.keyword.trim(),
    matches: (text) => phrases.some((p) => containsPhrase(text, p)),
    matchesAllWords: (text) => phrases.some((p) => containsAllWords(text, p)),
    countMatches: (text) => {
      const haystack = text === plainText ? textStems : stems(text);
      return phraseStemLists.reduce(
        (sum, p) => sum + phraseOccurrences(haystack, p),
        0
      );
    },
  };
};

// Premium: other posts whose topic this post mentions without linking to them.
const suggestLinks = (ctx: SeoContext): SeoLinkSuggestion[] => {
  const posts = ctx.input.otherPosts ?? [];
  if (posts.length === 0 || ctx.wordCount === 0) return [];
  const linkedHrefs = ctx.links.map((l) => l.href);
  return posts
    .filter((post) => {
      if (linkedHrefs.some((href) => href.includes(`/blog/${post.slug}`)))
        return false;
      const keyword = post.keyword.trim();
      if (keyword && containsPhrase(ctx.plainText, keyword)) return true;
      return !!post.title.trim() && containsAllWords(ctx.plainText, post.title);
    })
    .slice(0, 5)
    .map((post) => ({ title: post.title, slug: post.slug }));
};

export const analyzeSeo = (
  input: SeoInput,
  options: SeoOptions = {}
): SeoResult => {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
  const ctx = buildContext(input, thresholds);
  const disabled = new Set(options.disable ?? []);

  const checks: SeoCheck[] = [];
  for (const definition of [...BUILT_IN_CHECKS, ...(options.checks ?? [])]) {
    if (disabled.has(definition.id)) continue;
    const result = definition.run(ctx);
    if (result) checks.push(result);
  }
  if (!disabled.has("related-keyphrase")) {
    for (const result of relatedKeyphraseChecks(ctx)) {
      if (result) checks.push(result);
    }
  }

  const points = checks.reduce((sum, c) => sum + c.score, 0);
  const score =
    checks.length === 0 ? 0 : Math.round((100 * points) / (9 * checks.length));

  return {
    checks,
    problems: checks.filter((c) => c.status === "bad"),
    improvements: checks.filter((c) => c.status === "ok"),
    goodResults: checks.filter((c) => c.status === "good"),
    score,
    rating: ratingFor(score),
    linkSuggestions: suggestLinks(ctx),
  };
};

// Standalone field-level statuses for inline hints next to inputs (e.g. a
// red/orange character-count line under the meta-description textarea).
export const fieldStatus = {
  descriptionLength: (
    description: string,
    thresholds: Partial<SeoThresholds> = {}
  ): SeoCheckStatus => {
    const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
    const length = description.trim().length;
    if (length === 0) return "bad";
    if (length < t.descriptionMin || length > t.descriptionMax) return "ok";
    return "good";
  },
  titleWidth: (
    title: string,
    thresholds: Partial<SeoThresholds> = {}
  ): SeoCheckStatus => {
    const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
    const length = title.trim().length;
    if (length === 0 || length > t.titleWidthMax) return "bad";
    if (length < t.titleWidthMin) return "ok";
    return "good";
  },
};
