"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";

/**
 * The single active page as a live, always-interactive iframe. Loads the
 * published page with `?cms-preview=edit`, registers with the editing engine
 * (cms-bridge postMessage), and remounts (via `key`) whenever the selected
 * page changes so the bridge handshake re-runs cleanly.
 */
export function PageFrame({ page }: { page: { path: string; url: string } }) {
  const { registerFrame, editSrcFor, refreshFrameFromStore } =
    useCanvasEditor();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const iframe = iframeRef.current;
    registerFrame(page.path, iframe);
    return () => registerFrame(page.path, null);
  }, [page.path, registerFrame, reloadKey]);

  const reload = () => {
    refreshFrameFromStore(page.path);
    setLoaded(false);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-6">
      <div className="bg-background relative h-full w-full overflow-hidden rounded-xl border shadow-sm">
        {!loaded && (
          <div className="text-muted-foreground absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading page…
          </div>
        )}
        <iframe
          key={`${page.path}:${reloadKey}`}
          ref={iframeRef}
          src={editSrcFor(page.url)}
          title={page.path}
          className="h-full w-full border-0"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={reload}
        className="absolute right-9 top-9 z-20 shadow-sm"
        aria-label="Reload page"
      >
        <RotateCw className="size-3.5" />
        Reload
      </Button>
    </div>
  );
}
