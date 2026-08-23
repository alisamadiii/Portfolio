"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "@/components/icon";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import {
  DEVICE_WIDTH,
  type CanvasDevice,
} from "@/components/canvas/canvas-toolbar";

/**
 * The single active page as a live, always-interactive iframe on a dot-grid
 * canvas. Loads the published page with `?cms-preview=edit`, registers with the
 * editing engine (cms-bridge postMessage), and remounts (via `key`) whenever
 * the selected page changes so the bridge handshake re-runs cleanly. The frame
 * width follows the selected device; `reloadNonce` (bumped by the toolbar)
 * re-seeds from the drafts store and reloads.
 */
export function PageFrame({
  page,
  device,
  reloadNonce,
}: {
  page: { path: string; url: string };
  device: CanvasDevice;
  reloadNonce: number;
}) {
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

  // Toolbar-driven reload: re-seed working copy from localStorage, then remount.
  const lastNonce = useRef(reloadNonce);
  useEffect(() => {
    if (reloadNonce === lastNonce.current) return;
    lastNonce.current = reloadNonce;
    refreshFrameFromStore(page.path);
    setLoaded(false);
    setReloadKey((key) => key + 1);
  }, [reloadNonce, page.path, refreshFrameFromStore]);

  return (
    <div
      className="bg-shell flex-1 overflow-auto"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklch, var(--foreground) 14%, transparent) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="flex min-h-full items-stretch justify-center px-6 pb-6 pt-1">
        <div
          className="transition-[width] duration-300 ease-out"
          style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
        >
          <div className="bg-card relative h-full w-full overflow-hidden rounded-xl border shadow-sm">
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
        </div>
      </div>
    </div>
  );
}
