"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { Cloudflare, Netlify, Vercel } from "@workspace/ui/icons/hosting";

import { useTRPC } from "@workspace/trpc/client";
import {
  HOSTING_LABELS,
  type Hosting,
  isExternalHosting,
} from "@workspace/trpc/lib/hosting";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { Globe, Loader2, TriangleAlert } from "@/components/icon";

/**
 * Canvas toolbar "Live site" button, carrying the live-site build state. Every
 * publish builds the site on content-pilot (static output only) and the world
 * sees the built dist/: "Building site…" while the build runs, "Build failed"
 * (previous version stays online) with the error on click, otherwise a link
 * to the published site. Externally hosted projects never build here, so they
 * only ever get the link.
 */
// The host's own mark on the button; Globe for Content Pilot / other hosts.
const HOST_ICON: Partial<Record<Hosting, typeof Globe>> = {
  cloudflare: Cloudflare,
  netlify: Netlify,
  vercel: Vercel,
};

export function LiveSiteButton({ websiteUrl }: { websiteUrl: string | null }) {
  const { repoId } = useCanvasEditor();
  const trpc = useTRPC();

  const { data } = useQuery(
    trpc.cms.previewSession.liveSite.queryOptions(
      { repoId },
      {
        enabled: !!repoId,
        refetchInterval: (query) => {
          const status = query.state.data?.build?.status;
          return status === "queued" || status === "building" ? 3_000 : false;
        },
      }
    )
  );

  const build = data?.build;
  // Hosted on Netlify/Vercel/Cloudflare: no content-pilot build (liveSite
  // returns build: null), just name the host on hover.
  const host =
    data?.hosting && isExternalHosting(data.hosting)
      ? HOSTING_LABELS[data.hosting]
      : null;

  if (build?.status === "queued" || build?.status === "building") {
    return (
      <span className="border-border text-muted-foreground flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold">
        <Loader2 className="size-3.5 animate-spin" />
        Building site…
      </span>
    );
  }

  if (build?.status === "failed") {
    return (
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="border-border text-destructive hover:bg-muted flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors"
            >
              <TriangleAlert className="size-3.5" />
              Build failed
            </button>
          }
        />
        <PopoverContent align="end" className="w-96 gap-2">
          <PopoverTitle>The last publish didn't go live</PopoverTitle>
          <p className="text-muted-foreground text-[13px]">
            {data?.live
              ? "Your previous version is still online. "
              : "The site isn't online yet. "}
            {build.error}
          </p>
          {build.log && (
            <pre className="bg-muted max-h-56 overflow-auto rounded-md p-2 text-[11px] whitespace-pre-wrap">
              {build.log}
            </pre>
          )}
          {data?.live && websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-[13px] font-medium hover:underline"
            >
              Open the live site
            </a>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  if (!websiteUrl) return null;
  const Icon = (data?.hosting && HOST_ICON[data.hosting]) || Globe;
  return (
    <a
      href={websiteUrl}
      target="_blank"
      rel="noreferrer"
      title={host ? `Hosted on ${host}: ${websiteUrl}` : websiteUrl}
      className="border-border text-muted-foreground hover:bg-muted flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors"
    >
      <Icon className="size-3.5" />
      Live site
    </a>
  );
}
