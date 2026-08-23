"use client";

import { useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { useQuery } from "@tanstack/react-query";
import { Ban, Globe, ImageOff, Loader } from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";

import { getRawUrl } from "@/lib/github-image";
import { useWebsiteUrl } from "@/hooks/use-website-url";
import { isAbsoluteMediaUrl } from "@workspace/cms-core/utils/file";

export function Thumbnail({
  name,
  path,
  className,
  imgClassName,
}: {
  /** `.pages.yml` media name — only needed for repo-relative paths. */
  name?: string;
  path: string | null;
  className?: string;
  imgClassName?: string;
}) {
  // Track load failures per-URL so a path change naturally clears the error.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const { owner, repo, isPrivate } = useRepo();

  const { config } = useConfig();
  const branch = config?.branch!;

  // CDN / external / data URLs render directly — never resolved via GitHub.
  const isAbsolute = !!path && isAbsoluteMediaUrl(path);

  // Root-relative paths (e.g. `/favicon.ico`) are site-root assets — resolve
  // them against the project's live domain, not GitHub raw.
  const isRootRelative = !!path && !isAbsolute && path.startsWith("/");
  const { websiteUrl, status: domainStatus } = useWebsiteUrl();

  const rawUrlQuery = useQuery({
    queryKey: ["raw-url", owner, repo, branch, name ?? "", path ?? ""],
    queryFn: () => getRawUrl(owner, repo, branch, name!, path!, isPrivate),
    enabled: !!path && !isAbsolute && !isRootRelative && !!name,
    staleTime: 30_000,
    retry: false,
  });

  const rawUrl = isAbsolute
    ? path
    : isRootRelative
      ? domainStatus === "ready"
        ? `${websiteUrl}${path}`
        : null
      : (rawUrlQuery.data ?? null);

  // No live domain linked → root-relative assets can't be previewed.
  const noDomain = isRootRelative && domainStatus === "missing";
  const error = rawUrl && failedUrl === rawUrl
    ? "Image failed to load"
    : rawUrlQuery.error
      ? rawUrlQuery.error instanceof Error
        ? rawUrlQuery.error.message
        : "Unknown error"
      : path && !isAbsolute && !isRootRelative && (!name || (rawUrlQuery.isSuccess && !rawUrlQuery.data))
        ? "Image could not be resolved"
        : null;

  return (
    <div
      className={cn(
        "bg-muted relative aspect-square w-full overflow-hidden",
        className
      )}
    >
      {path ? (
        noDomain ? (
          <div
            className="text-muted-foreground absolute inset-0 flex items-center justify-center"
            title="Connect a domain to preview this image"
          >
            <Globe className="h-4 w-4" />
          </div>
        ) : error ? (
          <div
            className="text-muted-foreground absolute inset-0 flex items-center justify-center"
            title={error}
          >
            <Ban className="h-4 w-4" />
          </div>
        ) : rawUrl ? (
          <img
            src={rawUrl}
            alt={path.split("/").pop() || "thumbnail"}
            loading="lazy"
            onError={() => setFailedUrl(rawUrl)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              imgClassName
            )}
          />
        ) : (
          <div
            className="text-muted-foreground absolute inset-0 flex items-center justify-center"
            title="Loading..."
          >
            <Loader className="h-4 w-4 animate-spin" />
          </div>
        )
      ) : (
        <div
          className="text-muted-foreground absolute inset-0 flex items-center justify-center"
          title="No image"
        >
          <ImageOff className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
