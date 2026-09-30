"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import {
  Check,
  ExternalLink,
  ImageOff,
  Loader2,
  TriangleAlert,
  X,
} from "@/components/icon";

type SeoResult = RouterOutputs["cms"]["seo"]["inspectPage"];
type Seo = SeoResult["seo"];

/** One derived pass/warn/fail quality check shown as a chip. */
type CheckState = "pass" | "warn" | "fail";
type CheckItem = { label: string; state: CheckState; hint: string };

/**
 * Per-page SEO inspector. Fetches the SEO head of the selected LIVE page via
 * cms.seo.inspectPage (reusing the leads Site Inspector lib) and shows what
 * search engines see: a quick checklist plus the raw title/meta/OG/JSON-LD.
 */
export function SeoPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { repoId, currentPage } = useCanvasEditor();
  const trpc = useTRPC();
  const path = currentPage?.path ?? "/";

  const { data, isLoading, error } = useQuery(
    trpc.cms.seo.inspectPage.queryOptions(
      { repoId, path },
      {
        enabled: open && Boolean(repoId && currentPage?.path),
        staleTime: 60_000,
        retry: false,
      }
    )
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto border bg-white shadow-xl md:max-w-3xl dark:bg-neutral-950">
        <DialogHeader>
          <DialogTitle className="font-mono text-[15px]">
            SEO · {path}
          </DialogTitle>
          <DialogDescription>
            What search engines will see, including your unpublished edits.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Checking your page…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <TriangleAlert className="size-6 text-amber-500" />
            <p className="text-sm font-medium">Could not check this page</p>
            <p className="text-muted-foreground max-w-sm text-xs">
              {error.message}
            </p>
          </div>
        ) : data ? (
          <Results result={data} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Results({ result }: { result: SeoResult }) {
  const { seo } = result;
  const checks = useMemo(() => deriveChecks(seo), [seo]);

  return (
    <div className="space-y-5">
      {result.status >= 400 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-500/40 dark:bg-amber-950/50">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-amber-800 dark:text-amber-200">
            This page returned status {result.status}. It may still be loading
            in the preview, or the page does not exist yet.
          </div>
        </div>
      )}

      {/* Quick checklist */}
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <span
            key={check.label}
            title={check.hint}
            className={
              check.state === "pass"
                ? "flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : check.state === "warn"
                  ? "flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                  : "flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
            }
          >
            {check.state === "pass" ? (
              <Check className="size-3" />
            ) : check.state === "warn" ? (
              <TriangleAlert className="size-3" />
            ) : (
              <X className="size-3" />
            )}
            {check.label}
          </span>
        ))}
      </div>

      {/* Core tags */}
      <div className="divide-border overflow-hidden rounded-lg border">
        <Row label="Title" value={seo.title} showLength />
        <Row label="Description" value={seo.description} showLength />
        <Row label="Canonical" value={seo.canonical} mono />
        <Row label="Robots" value={seo.robots} />
        <Row label="Keywords" value={seo.keywords} />
      </div>

      {seo.og.length > 0 && (
        <MetaBlock
          title="Open Graph"
          rows={seo.og.map((m) => ({ key: m.property, content: m.content }))}
        />
      )}

      {seo.twitter.length > 0 && (
        <MetaBlock
          title="Twitter"
          rows={seo.twitter.map((m) => ({ key: m.name, content: m.content }))}
        />
      )}

      {seo.jsonLd.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
            Structured data ({seo.jsonLd.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {seo.jsonLd.flatMap((block, i) =>
              (block.types.length ? block.types : ["unknown"]).map((type) => (
                <span
                  key={`${i}-${type}`}
                  className="bg-muted text-foreground/80 rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  {type}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {seo.favicons.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
            Icons ({seo.favicons.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {seo.favicons.map((href) => (
              <FaviconChip key={href} href={href} />
            ))}
          </div>
        </div>
      )}

      {seo.hreflang.length > 0 && (
        <p className="text-muted-foreground text-xs break-all">
          Hreflang:{" "}
          {seo.hreflang.map((h) => `${h.lang} → ${h.href}`).join(" · ")}
        </p>
      )}

      <a
        href={result.finalUrl}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
      >
        <ExternalLink className="size-3.5" />
        {result.finalUrl}
      </a>
    </div>
  );
}

/** True when a meta value should render as an image preview (og:image, etc.). */
function isImageUrl(key: string, content: string): boolean {
  if (!/^https?:\/\//i.test(content)) return false;
  if (/image/i.test(key)) return true;
  return /\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)/i.test(content);
}

/** Preview thumbnail for an image meta value, with the URL and a broken-image
 *  fallback (the preview dev server may not serve the asset yet). */
function MetaImage({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      {broken ? (
        <span className="bg-muted text-muted-foreground/60 flex aspect-video w-full max-w-sm items-center justify-center rounded-md border">
          <ImageOff className="size-4" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setBroken(true)}
          className="bg-muted aspect-video w-full max-w-sm rounded-md border object-cover"
          loading="lazy"
        />
      )}
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground break-all font-mono"
      >
        {src}
      </a>
    </div>
  );
}

/** A favicon pill that falls back to a placeholder glyph when the image 404s
 *  (common in the preview dev server, where icon assets aren't built yet). */
function FaviconChip({ href }: { href: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={href}
      className="bg-muted hover:bg-muted/70 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors"
    >
      {broken ? (
        <span className="bg-card text-muted-foreground/60 flex size-6 items-center justify-center rounded-md">
          <ImageOff className="size-3.5" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={href}
          alt=""
          onError={() => setBroken(true)}
          className="bg-card size-6 rounded-md object-contain p-0.5"
          loading="lazy"
        />
      )}
      <span className="text-muted-foreground max-w-48 truncate font-mono text-xs">
        {href.split("/").pop() || href}
      </span>
    </a>
  );
}

function Row({
  label,
  value,
  showLength,
  mono,
}: {
  label: string;
  value: string | null;
  showLength?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="border-border flex gap-3 border-b p-3 text-sm last:border-b-0">
      <span className="text-muted-foreground w-24 shrink-0 font-medium">
        {label}
      </span>
      {value ? (
        <span
          className={
            mono ? "min-w-0 font-mono text-xs break-all" : "min-w-0 break-words"
          }
        >
          {value}
          {showLength && (
            <span className="text-muted-foreground ml-1.5 tabular-nums">
              ({value.length})
            </span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground/70 italic">not set</span>
      )}
    </div>
  );
}

function MetaBlock({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; content: string }[];
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
        {title}
      </p>
      <div className="divide-border overflow-hidden rounded-lg border">
        {rows.map((row, i) => (
          <div
            key={`${row.key}-${i}`}
            className="border-border flex gap-3 border-b p-2.5 text-xs last:border-b-0"
          >
            <span className="text-muted-foreground w-40 shrink-0 truncate font-mono">
              {row.key}
            </span>
            <div className="min-w-0 flex-1">
              {isImageUrl(row.key, row.content) ? (
                <MetaImage src={row.content} />
              ) : (
                <span className="break-words">{row.content}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Client-side quality heuristics over the extracted head (no server score). */
function deriveChecks(seo: Seo): CheckItem[] {
  const checks: CheckItem[] = [];

  const titleLen = seo.title?.trim().length ?? 0;
  checks.push({
    label: "Title",
    state:
      titleLen === 0
        ? "fail"
        : titleLen < 30 || titleLen > 60
          ? "warn"
          : "pass",
    hint:
      titleLen === 0
        ? "No <title> tag"
        : `Title is ${titleLen} characters (aim for 30–60)`,
  });

  const descLen = seo.description?.trim().length ?? 0;
  checks.push({
    label: "Description",
    state:
      descLen === 0 ? "fail" : descLen < 50 || descLen > 160 ? "warn" : "pass",
    hint:
      descLen === 0
        ? "No meta description"
        : `Description is ${descLen} characters (aim for 50–160)`,
  });

  checks.push({
    label: "Canonical",
    state: seo.canonical ? "pass" : "warn",
    hint: seo.canonical ? "Canonical URL is set" : "No canonical URL",
  });

  const hasOgImage = seo.og.some(
    (m) => m.property.toLowerCase() === "og:image"
  );
  checks.push({
    label: "Social image",
    state: hasOgImage ? "pass" : "warn",
    hint: hasOgImage
      ? "og:image is set"
      : "No og:image — links to this page won't show a preview image",
  });

  const noindex = /noindex/i.test(seo.robots ?? "");
  if (noindex) {
    checks.push({
      label: "Noindex",
      state: "fail",
      hint: "This page tells search engines NOT to index it",
    });
  }

  return checks;
}
