"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudOff, Globe, ShieldCheck } from "lucide-react";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTRPC } from "@workspace/trpc/client";

// Logical size the live site renders at inside the preview iframe before it's
// scaled down to the box width. A desktop-ish viewport so previews look like
// the real homepage, not a mobile breakpoint.
const FRAME_W = 1280;
const FRAME_H = 800;

export const hostOf = (url: string) =>
  url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

/**
 * Which accessible sites refuse to be iframed here (security headers), checked
 * server-side since the browser hides why a cross-origin frame stays blank.
 * Unknown (check failed, or a URL the server skipped) falls back to "frameable"
 * rather than a skeleton that never resolves.
 */
export function useFramePolicy(projectId: string, websiteUrl: string | null | undefined) {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.cms.repos.framePolicies.queryOptions(
      {
        origin:
          typeof window === "undefined"
            ? "https://hub.alisamadii.com"
            : window.location.origin,
      },
      { enabled: !!websiteUrl, staleTime: 30 * 60 * 1000 }
    )
  );
  if (!websiteUrl) return undefined;
  if (query.isError) return "frameable" as const;
  if (!query.data) return undefined;
  return query.data[projectId] ?? ("frameable" as const);
}

function PreviewNotice({ url, policy }: { url: string; policy: "blocked" | "unreachable" }) {
  const Icon = policy === "blocked" ? ShieldCheck : CloudOff;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-dim">
      <span className="grid size-10 place-items-center rounded-full bg-surface/70">
        <Icon className="size-5" />
      </span>
      <p className="truncate text-[13px] font-semibold text-ink-2">{hostOf(url)}</p>
      <p className="text-[11.5px] leading-snug">
        {policy === "blocked" ? "Preview hidden by the site's security settings" : "Site didn't respond"}
      </p>
    </div>
  );
}

/**
 * Browser-frame preview of the live site: a 28px chrome bar (three dots +
 * domain) over a scaled, non-interactive iframe. Measures its own width and
 * scales a fixed FRAME_W×FRAME_H frame to fit, so it reads like a screenshot.
 * The iframe only mounts once the server confirmed the site allows framing.
 */
export function SitePreview({
  projectId,
  websiteUrl,
}: {
  projectId: string;
  websiteUrl: string | null | undefined;
}) {
  const policy = useFramePolicy(projectId, websiteUrl);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(box.clientWidth / FRAME_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const url = websiteUrl ?? null;
  return (
    <div className="overflow-hidden rounded-inner border border-line bg-surface">
      <div className="flex h-7 items-center gap-2 border-b border-divider bg-sidebar px-3">
        <span className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
        </span>
        <span className="truncate text-xs text-dim">{url ? hostOf(url) : "No domain yet"}</span>
      </div>
      <div ref={boxRef} className="pointer-events-none relative aspect-[16/10] overflow-hidden bg-subtle">
        {url && (policy === "blocked" || policy === "unreachable") ? (
          <PreviewNotice url={url} policy={policy} />
        ) : url && policy === "frameable" && scale > 0 ? (
          <iframe
            src={url}
            title="Website preview"
            aria-hidden
            tabIndex={-1}
            loading="lazy"
            scrolling="no"
            sandbox="allow-scripts allow-same-origin"
            className="absolute top-0 left-0 origin-top-left border-0"
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}
          />
        ) : url && !policy ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : (
          <div className="grid h-full place-items-center text-faint">
            <Globe className="size-8" />
          </div>
        )}
      </div>
    </div>
  );
}
