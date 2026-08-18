/**
 * Shared types for the cms-bridge CLI (v2 three-file contract).
 */

import type { CmsManifest } from "./core/manifest.js";

// ---------------------------------------------------------------------------
// Scan results
// ---------------------------------------------------------------------------

export type PageFile = {
  /** Absolute path to the .astro file. */
  filePath: string;
  /** Path relative to the project root (for display + report). */
  relPath: string;
  /** URL route ("/", "/menu", "/our-story"). */
  route: string;
  /** pages.json key this page's content lives under (route-adopted or derived). */
  pageKey: string;
  /** Frontmatter identifier bound to `pages.<key>` (default "content"). */
  contentIdent: string;
  /** True when the page already binds `const <ident> = pages.<key>`. */
  hasPagesBinding: boolean;
  source: string;
};

export type ProjectScan = {
  root: string;
  pages: PageFile[];
  /** Parsed cms.json, or null when the project isn't wired yet. */
  manifest: CmsManifest | null;
  /** Parsed pages.json ({} when absent). */
  pagesJson: Record<string, unknown>;
  /** Parsed site.json ({} when absent). */
  siteJson: Record<string, unknown>;
  /** astro.config.(mjs|js|ts) path, null when not found. */
  astroConfigPath: string | null;
  /** True when the cms-bridge integration import already exists in the config. */
  hasBridgeIntegration: boolean;
};

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/** Semantic role a safe element maps to. */
export type FieldRole =
  | "heading"
  | "title"
  | "subtitle"
  | "text"
  | "eyebrow"
  | "cta"
  | "image";

export type CandidateField = {
  role: FieldRole;
  tag: string;
  /** Section prefix segments (usually one) — final path = [...section, key]. */
  sectionChain: string[];
  /** Assigned by naming pass — full dot path relative to the entry. */
  path?: string;
  /** Static text content (text roles + cta label). */
  text?: string;
  /** cta: static href value. image: static src value. */
  href?: string;
  src?: string;
  alt?: string;
  line: number;
  /** Offsets needed by the transform pass. */
  el: {
    /** Element start offset (at `<`). */
    start: number;
    name: string;
    /** Text node start offset + raw value (text roles / cta label). */
    textStart?: number;
    textValue?: string;
    /** cta: whether label is already wrapped in a <span>. */
    labelInSpan?: boolean;
    /** span element offsets when present. */
    spanStart?: number;
    spanName?: string;
    /** Attr spans for value rewrites: [startOffset, rawLength] over `name="value"`. */
    hrefAttr?: { start: number; raw: string };
    srcAttr?: { start: number; raw: string };
    altAttr?: { start: number; raw: string };
  };
};

export type ReasonCode =
  | "R0"
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5"
  | "R6"
  | "R7"
  | "R8"
  | "R9"
  | "R10"
  | "R12";

export type ReportItem = {
  code: ReasonCode;
  file: string;
  line: number;
  excerpt: string;
  note?: string;
  suggestedKey?: string;
};

export type PageAnalysis = {
  page: PageFile;
  /** True when the page already imports a src/data JSON (adopted project). */
  adopted: boolean;
  /** data-cms-field paths already present in the page. */
  adoptedPaths: string[];
  candidates: CandidateField[];
  reports: ReportItem[];
};
