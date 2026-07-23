"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { Ban, ImageOff, Loader } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { getRawUrl } from "@/lib/github-image";

export function Thumbnail({
  name,
  path,
  className,
}: {
  name: string;
  path: string | null;
  className?: string;
}) {
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [error, setError] = useState(null);

  const { owner, repo, isPrivate } = useRepo();

  const { config } = useConfig();
  const branch = config?.branch!;

  useEffect(() => {
    const fetchRawUrl = async () => {
      if (path) {
        setError(null);
        if (!rawUrl) setRawUrl(null);
        try {
          const url = await getRawUrl(
            owner,
            repo,
            branch,
            name,
            path,
            isPrivate
          );
          setRawUrl(url);
        } catch (error: any) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.warn(errorMessage);
          setError(error.message);
        }
      }
    };

    fetchRawUrl();
  }, [path, owner, repo, branch, isPrivate, name, rawUrl]);

  return (
    <div
      className={cn(
        "bg-muted relative aspect-square w-full overflow-hidden",
        className
      )}
    >
      {path ? (
        rawUrl ? (
          <img
            src={rawUrl}
            alt={path.split("/").pop() || "thumbnail"}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : error ? (
          <div
            className="text-muted-foreground absolute inset-0 flex items-center justify-center"
            title={error}
          >
            <Ban className="h-4 w-4" />
          </div>
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
