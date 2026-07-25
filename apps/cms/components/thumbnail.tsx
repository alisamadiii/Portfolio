"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { Ban, ImageOff, Loader } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { getRawUrl } from "@/lib/github-image";
import { isAbsoluteMediaUrl } from "@/lib/utils/file";

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
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { owner, repo, isPrivate } = useRepo();

  const { config } = useConfig();
  const branch = config?.branch!;

  useEffect(() => {
    setError(null);
    setRawUrl(null);

    if (!path) return;

    // CDN / external / data URLs render directly — never resolved via GitHub.
    if (isAbsoluteMediaUrl(path)) {
      setRawUrl(path);
      return;
    }

    // Repo-relative paths need the `.pages.yml` media name to resolve.
    if (!name) {
      setError("Image could not be resolved");
      return;
    }

    let cancelled = false;
    const fetchRawUrl = async () => {
      try {
        const url = await getRawUrl(owner, repo, branch, name, path, isPrivate);
        if (cancelled) return;
        if (url) {
          setRawUrl(url);
        } else {
          setError("Image could not be resolved");
        }
      } catch (err: any) {
        if (cancelled) return;
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.warn(errorMessage);
        setError(errorMessage);
      }
    };

    fetchRawUrl();

    return () => {
      cancelled = true;
    };
  }, [path, owner, repo, branch, isPrivate, name]);

  return (
    <div
      className={cn(
        "bg-muted relative aspect-square w-full overflow-hidden",
        className
      )}
    >
      {path ? (
        error ? (
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
            onError={() => setError("Image failed to load")}
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
