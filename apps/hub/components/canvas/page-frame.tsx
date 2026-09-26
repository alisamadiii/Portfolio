"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "@/components/icon";

import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import {
  DEVICE_WIDTH,
  type CanvasDevice,
} from "@/components/canvas/canvas-toolbar";

/** Same normalization as the context's preview-navigate matching. */
const normPath = (value: string): string => {
  let path = value;
  try {
    path = new URL(value, "http://x").pathname;
  } catch {
    // keep as-is
  }
  path = path.replace(/\/+$/, "");
  return path === "" ? "/" : path;
};

/**
 * The single active page as a live, always-interactive iframe on a dot-grid
 * canvas. Loads the published page with `?cms-preview=edit`, registers with the
 * editing engine (cms-bridge postMessage), and remounts (via `key`) whenever
 * the selected page changes so the bridge handshake re-runs cleanly. The frame
 * width follows the selected device; `reloadNonce` (bumped by the toolbar)
 * re-seeds from the drafts store and reloads.
 *
 * AI-session mode is different: the frame must survive both in-frame
 * navigation (client clicks links; the tree follows via preview-navigate) and
 * tree-driven navigation without a remount. The iframe identity stays stable,
 * src is set once on mount, and navigation is imperative — only when the tree
 * selects a page the frame is NOT already on.
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
  const {
    registerFrame,
    editSrcFor,
    refreshFrameFromStore,
    session,
    previewFramePath,
  } = useCanvasEditor();
  const sessionMode = Boolean(session);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const iframe = iframeRef.current;
    registerFrame(page.path, iframe);
    return () => registerFrame(page.path, null);
  }, [page.path, registerFrame, reloadKey, sessionMode]);

  // Session mode: the mount-time src (captured once; navigation afterwards is
  // imperative — see the effect below).
  const initialSrc = useRef<string | null>(null);
  if (sessionMode && initialSrc.current === null) {
    initialSrc.current = editSrcFor(page.url);
  }
  if (!sessionMode && initialSrc.current !== null) {
    initialSrc.current = null;
  }

  // Toolbar-driven reload: re-seed working copy from localStorage, then remount.
  const lastNonce = useRef(reloadNonce);
  useEffect(() => {
    if (reloadNonce === lastNonce.current) return;
    lastNonce.current = reloadNonce;
    refreshFrameFromStore(page.path);
    // Session mode: recapture the mount src for the CURRENT page, or the
    // remounted frame would reload whatever page the session started on.
    initialSrc.current = null;
    setLoaded(false);
    setReloadKey((key) => key + 1);
  }, [reloadNonce, page.path, refreshFrameFromStore]);

  // Session mode: navigate imperatively, and ONLY when the frame isn't
  // already on the selected page — a tree update caused by in-frame
  // navigation must not reload the page the client just landed on.
  useEffect(() => {
    if (!sessionMode) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Until the first preview-navigate arrives the frame is still loading its
    // mount src — touching it here would double-load.
    if (!previewFramePath) return;
    if (normPath(previewFramePath) === normPath(page.path)) return;
    // The frame is on a different page than the tree selection → tree-driven
    // navigation. Assign unconditionally: the src attribute can be stale
    // (in-frame navigation doesn't update it), so comparing against it lies.
    setLoaded(false);
    iframe.src = editSrcFor(page.url);
  }, [sessionMode, page.path, page.url, previewFramePath, editSrcFor]);

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
              key={sessionMode ? `session:${reloadKey}` : `${page.path}:${reloadKey}`}
              ref={iframeRef}
              src={sessionMode ? (initialSrc.current ?? undefined) : editSrcFor(page.url)}
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
