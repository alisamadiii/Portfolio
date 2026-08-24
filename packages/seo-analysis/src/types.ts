import type { SeoImage, SeoLink } from "./parse";

export type SeoCheckStatus = "good" | "ok" | "bad";
export type SeoRating = "good" | "ok" | "bad";

export type SeoCheck = {
  id: string;
  status: SeoCheckStatus;
  /** Points this check contributes: good = 9, ok = 5, bad = 2. */
  score: number;
  /** Full Yoast-voice sentence, including the measured value. */
  text: string;
};

export type SeoInput = {
  title: string;
  slug: string;
  /** Meta description. */
  description: string;
  /** Focus keyphrase. */
  keyword: string;
  /** Markdown body. */
  body: string;
  heroImage?: string;
  heroImageAlt?: string;
  /** Premium: phrases treated as keyphrase matches everywhere. */
  synonyms?: string[];
  /** Premium: each gets a presence check of its own. */
  relatedKeywords?: string[];
  /** Focus keyphrases of the site's other posts (previously-used check). */
  otherKeywords?: string[];
  /** Premium: other posts, for internal-link suggestions. */
  otherPosts?: { title: string; slug: string; keyword: string }[];
};

export type SeoThresholds = {
  titleWidthMin: number;
  titleWidthMax: number;
  descriptionMin: number;
  descriptionMax: number;
  keyphraseGoodWords: number;
  keyphraseOkWords: number;
  densityMin: number;
  densityMax: number;
  textLengthGood: number;
  textLengthMin: number;
  subheadingMaxRatio: number;
};

export const DEFAULT_THRESHOLDS: SeoThresholds = {
  titleWidthMin: 20,
  titleWidthMax: 60,
  descriptionMin: 120,
  descriptionMax: 156,
  keyphraseGoodWords: 4,
  keyphraseOkWords: 8,
  densityMin: 0.5,
  densityMax: 3,
  textLengthGood: 900,
  textLengthMin: 300,
  subheadingMaxRatio: 0.75,
};

/** Parsed document + matchers, handed to every check (built-in and custom). */
export type SeoContext = {
  input: SeoInput;
  thresholds: SeoThresholds;
  plainText: string;
  wordCount: number;
  headings: string[];
  links: SeoLink[];
  images: SeoImage[];
  firstParagraph: string;
  /** Plain text split into 4 equal word chunks (distribution check). */
  quarters: string[];
  hasKeyword: boolean;
  /** Keyphrase (or any synonym) appears as an exact phrase, word-forms aware. */
  matches: (text: string) => boolean;
  /** Every keyphrase word appears somewhere (any order, any synonym). */
  matchesAllWords: (text: string) => boolean;
  /** Exact-phrase occurrence count across keyword + synonyms. */
  countMatches: (text: string) => number;
};

export type SeoCheckDefinition = {
  id: string;
  /** Return null to skip (not applicable — hidden and unscored). */
  run: (ctx: SeoContext) => SeoCheck | null;
};

export type SeoOptions = {
  /** Plugin point: extra custom checks, run after the built-ins. */
  checks?: SeoCheckDefinition[];
  /** Built-in check ids to turn off. */
  disable?: string[];
  thresholds?: Partial<SeoThresholds>;
};

export type SeoLinkSuggestion = { title: string; slug: string };

export type SeoResult = {
  checks: SeoCheck[];
  problems: SeoCheck[];
  improvements: SeoCheck[];
  goodResults: SeoCheck[];
  /** 0–100. */
  score: number;
  /** Traffic light: ≥71 good, 41–70 ok, ≤40 bad. */
  rating: SeoRating;
  /** Premium: other posts worth linking to that aren't linked yet. */
  linkSuggestions: SeoLinkSuggestion[];
};

export const STATUS_POINTS: Record<SeoCheckStatus, number> = {
  good: 9,
  ok: 5,
  bad: 2,
};

export const check = (
  id: string,
  status: SeoCheckStatus,
  text: string
): SeoCheck => ({ id, status, score: STATUS_POINTS[status], text });
