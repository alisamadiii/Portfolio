"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Columns2,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  PictureInPicture2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { cn } from "@workspace/ui/lib/utils";

import type { PreviewTarget } from "@/lib/preview";

import { PreviewProvider } from "@/components/entry/preview-context";

const VISIBLE_KEY = "cms-preview:visible";
const COLLAPSED_KEY = "cms-preview:collapsed";
const MODE_KEY = "cms-preview:mode";

type PreviewMode = "float" | "split";

function readFlag(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  return stored === null ? fallback : stored === "1";
}

function readMode(fallback: PreviewMode): PreviewMode {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(MODE_KEY);
  return stored === "split" || stored === "float" ? stored : fallback;
}

/**
 * Live-site preview docked bottom-right. Loads the page once and, when a field
 * input is focused, `postMessage`s the field path to the site's bridge script
 * which scrolls to and highlights the matching element. No reload on focus.
 *
 * Wraps `children` in a `PreviewProvider` so every field's focus handler can
 * reach `focusField` regardless of depth.
 */
export function PreviewPanel({
  target,
  pageKey,
  pageTitle,
  children,
}: {
  target: PreviewTarget;
  /** Changes when the edited entry changes — used to reload the iframe. */
  pageKey: string;
  pageTitle?: string;
  children: React.ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string | null>(null);

  const [visible, setVisible] = useState(() => readFlag(VISIBLE_KEY, true));
  const [collapsed, setCollapsed] = useState(() =>
    readFlag(COLLAPSED_KEY, false)
  );
  const [mode, setMode] = useState<PreviewMode>(() => readMode("float"));
  const [maximized, setMaximized] = useState(false);
  // Iframe content zoom (`transform: scale`); 1 = 100%.
  const [zoom, setZoom] = useState(1);
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 1.5;
  const stepZoom = useCallback(
    (delta: number) =>
      setZoom((z) =>
        Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 10) / 10))
      ),
    []
  );
  // Split needs room; below `lg` we always fall back to the floating panel so
  // the mode toggle stays reachable.
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const effectiveMode: PreviewMode =
    mode === "split" && isWide ? "split" : "float";

  useEffect(() => {
    window.localStorage.setItem(VISIBLE_KEY, visible ? "1" : "0");
  }, [visible]);
  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const post = useCallback(
    (fieldName: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "cms-field-focus", field: fieldName },
        target.origin
      );
    },
    [target.origin]
  );

  const focusField = useCallback(
    (fieldName: string) => {
      if (readyRef.current) post(fieldName);
      else pendingRef.current = fieldName;
    },
    [post]
  );

  // Bridge readiness handshake: the site posts `cms-preview-ready` on load.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== target.origin) return;
      if (event.data?.type === "cms-preview-ready") {
        readyRef.current = true;
        if (pendingRef.current) {
          post(pendingRef.current);
          pendingRef.current = null;
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post, target.origin]);

  // A new page invalidates the previous handshake until the reload completes.
  useEffect(() => {
    readyRef.current = false;
  }, [target.href]);

  const reload = useCallback(() => {
    readyRef.current = false;
    if (iframeRef.current) iframeRef.current.src = target.href;
  }, [target.href]);

  // Shared header controls. `collapse` (float-only) hidden in split mode.
  const controls = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={reload}
        aria-label="Reload preview"
      >
        <RefreshCw className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setMode((m) => (m === "split" ? "float" : "split"))}
        aria-label={
          effectiveMode === "split"
            ? "Switch to floating preview"
            : "Switch to split-column preview"
        }
      >
        {effectiveMode === "split" ? (
          <PictureInPicture2 className="size-3.5" />
        ) : (
          <Columns2 className="size-3.5" />
        )}
      </Button>
      {effectiveMode === "float" && !maximized && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand preview" : "Collapse preview"}
        >
          {collapsed ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </Button>
      )}
      <ButtonGroup>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={() => stepZoom(-0.1)}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Zoom out preview"
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setZoom(1)}
          disabled={zoom === 1}
          aria-label="Reset zoom to 100%"
          className="min-w-11 tabular-nums"
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={() => stepZoom(0.1)}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Zoom in preview"
        >
          <Plus className="size-3.5" />
        </Button>
      </ButtonGroup>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setMaximized((prev) => !prev)}
        aria-label={maximized ? "Minimize preview" : "Maximize preview"}
      >
        {maximized ? (
          <Minimize2 className="size-3.5" />
        ) : (
          <Maximize2 className="size-3.5" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setVisible(false)}
        aria-label="Hide preview"
      >
        <X className="size-3.5" />
      </Button>
    </>
  );

  const header = (
    <div className="bg-muted/40 flex h-10 shrink-0 items-center gap-2 border-b px-3">
      <Monitor className="text-muted-foreground size-4" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {pageTitle || "Preview"}
      </span>
      {controls}
    </div>
  );

  // The iframe, zoomed via `transform: scale`. Inverse width/height keep the
  // scaled page filling its (overflow-clipped) container.
  const frame = (outerClass?: string) => (
    <div className={cn("overflow-hidden bg-white", outerClass)}>
      <iframe
        ref={iframeRef}
        key={pageKey}
        src={target.href}
        title="Live preview"
        className="block border-0"
        style={{
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );

  // Maximized: iframe fills the screen as a fixed overlay. Form stays mounted
  // underneath so RHF state survives the toggle.
  if (maximized && visible) {
    return (
      <PreviewProvider focusField={focusField}>
        {children}
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {header}
          {frame("flex-1")}
        </div>
      </PreviewProvider>
    );
  }

  // Split mode: resizable two-pane — form left (page scrolls), iframe right
  // pinned sticky and full-height, with a static header bar above it.
  // Falls back to the floating panel below the `lg` breakpoint (`isWide`).
  //
  // The lib hard-codes `overflow: hidden` + `height: 100%` on the group and
  // `overflow: hidden` on panels, which clips the sticky iframe on scroll — we
  // override those inline styles so the pane can stretch and the sticky child
  // pins against the (tall) form column.
  if (effectiveMode === "split" && visible) {
    return (
      <PreviewProvider focusField={focusField}>
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="cms-preview-split"
          style={{ overflow: "visible", height: "auto" }}
        >
          <ResizablePanel
            defaultSize={62}
            minSize={35}
            className="min-w-0"
            style={{ overflow: "visible" }}
          >
            {children}
          </ResizablePanel>
          <ResizableHandle withHandle className="mx-2" />
          <ResizablePanel
            defaultSize={38}
            minSize={25}
            style={{ overflow: "visible" }}
          >
            <div className="bg-background sticky top-16 flex h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-xl border shadow-sm">
              {header}
              {frame("flex-1")}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </PreviewProvider>
    );
  }

  return (
    <PreviewProvider focusField={focusField}>
      {children}

      {visible ? (
        <div
          className={cn(
            "bg-background fixed right-4 bottom-4 z-40 flex flex-col overflow-hidden rounded-xl border shadow-2xl",
            "w-[min(24rem,calc(100vw-2rem))]"
          )}
        >
          {header}

          {/* Kept mounted while collapsed so the loaded page/handshake survives. */}
          <div className={cn(collapsed ? "hidden" : "block")}>
            {frame("h-[32rem] max-h-[70vh]")}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setVisible(true)}
          className="fixed right-4 bottom-4 z-40 shadow-lg"
        >
          <Monitor className="size-4" />
          Preview
        </Button>
      )}
    </PreviewProvider>
  );
}
