"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";

export const PreviewPanel = ({
  url,
}: {
  url: string | null;
}) => {
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  if (!url) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <span className="text-muted-foreground truncate text-xs">{url}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center">
            <Spinner />
          </div>
        )}
        <iframe
          key={reloadKey}
          src={url}
          className="absolute inset-0 h-full w-full border-0"
          onLoad={() => setLoading(false)}
          title="Website Preview"
        />
      </div>
    </div>
  );
};
