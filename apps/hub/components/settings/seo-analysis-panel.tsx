"use client";

import { useDeferredValue, useMemo } from "react";
import {
  analyzeSeo,
  type SeoCheck,
  type SeoCheckStatus,
  type SeoRating,
  type SeoResult,
} from "@alisamadiillc/seo-analysis";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { cn } from "@workspace/ui/lib/utils";

// Yoast-style analysis sidebar for the blog post editor. Render-only: it
// receives the editor's live values and reports problems / improvements /
// good results — it never gates saving or publishing.

const DOT_CLASS: Record<SeoCheckStatus, string> = {
  good: "bg-status-success",
  ok: "bg-status-warning",
  bad: "bg-status-danger",
};

const RATING_META: Record<SeoRating, { label: string; pill: string }> = {
  good: { label: "Good", pill: "bg-status-success-bg text-status-success" },
  ok: { label: "OK", pill: "bg-status-warning-bg text-status-warning" },
  bad: { label: "Needs work", pill: "bg-status-danger-bg text-status-danger" },
};

export const SeoAnalysisPanel = ({
  title,
  slug,
  description,
  keyword,
  synonyms,
  relatedKeywords,
  body,
  heroImage,
  heroImageAlt,
  otherKeywords,
  otherPosts,
}: {
  title: string;
  slug: string;
  description: string;
  keyword: string;
  synonyms: string[];
  relatedKeywords: string[];
  body: string;
  heroImage: string;
  heroImageAlt: string;
  otherKeywords: string[];
  otherPosts: { title: string; slug: string; keyword: string }[];
}) => {
  // Body changes on every keystroke in TipTap — defer it so typing never
  // waits on the analysis.
  const deferredBody = useDeferredValue(body);

  const analysis = useMemo(
    () =>
      analyzeSeo({
        title,
        slug,
        description,
        keyword,
        synonyms,
        relatedKeywords,
        body: deferredBody,
        heroImage,
        heroImageAlt,
        otherKeywords,
        otherPosts,
      }),
    [
      title,
      slug,
      description,
      keyword,
      synonyms,
      relatedKeywords,
      deferredBody,
      heroImage,
      heroImageAlt,
      otherKeywords,
      otherPosts,
    ]
  );

  const rating = RATING_META[analysis.rating];

  return (
    <div className="bg-card space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn("size-2.5 rounded-full", DOT_CLASS[analysis.rating])}
        />
        <p className="text-[12.5px] font-bold">SEO analysis</p>
        <div className="flex-1" />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10.5px] font-bold",
            rating.pill
          )}
        >
          {rating.label}
        </span>
      </div>

      <SnippetPreview title={title} slug={slug} description={description} />

      {!keyword.trim() && (
        <p className="text-muted-foreground text-[11.5px] leading-relaxed">
          Set a target keyword under Post settings → Advanced to unlock the
          keyphrase checks.
        </p>
      )}

      <Accordion defaultValue={["problems"]} className="-mb-2 border-t">
        <CheckGroup
          value="problems"
          label="Problems"
          checks={analysis.problems}
        />
        <CheckGroup
          value="improvements"
          label="Improvements"
          checks={analysis.improvements}
        />
        <CheckGroup
          value="good"
          label="Good results"
          checks={analysis.goodResults}
        />
      </Accordion>

      <LinkSuggestions suggestions={analysis.linkSuggestions} />
    </div>
  );
};

// ─── Google snippet preview ──────────────────────────────────────

const clamp = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

const SnippetPreview = ({
  title,
  slug,
  description,
}: {
  title: string;
  slug: string;
  description: string;
}) => (
  <div className="bg-background space-y-1 rounded-md border p-3">
    <p className="text-muted-foreground text-[9.5px] font-bold tracking-wide uppercase">
      Google preview
    </p>
    <p className="text-muted-foreground truncate font-mono text-[11px]">
      /blog/{slug || "…"}
    </p>
    <p className="text-status-info text-[14px] leading-snug font-medium">
      {title ? clamp(title, 60) : "Post title"}
    </p>
    <p className="text-muted-foreground text-[12px] leading-snug">
      {description
        ? clamp(description, 156)
        : "The meta description appears here."}
    </p>
  </div>
);

// ─── Checklist ───────────────────────────────────────────────────

const CheckGroup = ({
  value,
  label,
  checks,
}: {
  value: string;
  label: string;
  checks: SeoCheck[];
}) => {
  if (checks.length === 0) return null;
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="py-2.5 text-[12px] font-semibold hover:no-underline">
        {label} ({checks.length})
      </AccordionTrigger>
      <AccordionContent className="pb-2.5">
        <ul className="space-y-2">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  DOT_CLASS[check.status]
                )}
              />
              <span className="text-muted-foreground text-[12px] leading-snug">
                {check.text}
              </span>
            </li>
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
};

// ─── Internal-link suggestions (premium) ─────────────────────────

const LinkSuggestions = ({
  suggestions,
}: {
  suggestions: SeoResult["linkSuggestions"];
}) => {
  if (suggestions.length === 0) return null;
  return (
    <div className="space-y-1.5 border-t pt-3">
      <p className="text-[12px] font-semibold">Consider linking to</p>
      <ul className="space-y-1">
        {suggestions.map((post) => (
          <li key={post.slug} className="text-[12px] leading-snug">
            <span className="font-medium">{post.title}</span>{" "}
            <span className="text-muted-foreground font-mono text-[10.5px]">
              /blog/{post.slug}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
