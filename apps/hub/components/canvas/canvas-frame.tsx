"use client";

import { memo, useCallback, useRef } from "react";
import { ArrowRight, FileText, Globe, PencilLine, Table2 } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

export type FrameRect = { x: number; y: number; width: number; height: number };

export type CanvasPageInfo = {
  path: string;
  url: string;
  title: string;
  entry?: string;
  kind?: "page" | "collection";
  collection?: string;
};

/**
 * One page frame on the canvas. The placeholder card always renders (cheap
 * DOM — keeps the canvas shape visible zoomed out); the iframe mounts only
 * while the frame is in the visible band and within the mounted-iframe cap.
 *
 * A transparent hit overlay sits above the iframe so pan/zoom and selection
 * work at any scale; double-click "engages" the frame (overlay removed,
 * page becomes interactive/editable) — Figma's model.
 */
export const CanvasFrame = memo(function CanvasFrame({
  page,
  rect,
  mounted,
  engaged,
  selected,
  editSrc,
  editHref,
  seoAvailable,
  onOpenSeo,
  onOpenCollection,
  onSelect,
  onEngage,
  onLoad,
  registerFrame,
}: {
  page: CanvasPageInfo;
  rect: FrameRect;
  mounted: boolean;
  engaged: boolean;
  selected: boolean;
  /** Iframe src including the `?cms-preview=edit` flag. */
  editSrc: string;
  /** Input-view editor route for the mapped entry (null = view-only page). */
  editHref: string | null;
  /** The mapped entry has an editable `seo` object. */
  seoAvailable?: boolean;
  onOpenSeo?: (path: string) => void;
  /** Open the CMS overlay on this page's collection (collection cards). */
  onOpenCollection?: (collection: string) => void;
  onSelect: (path: string) => void;
  onEngage: (path: string) => void;
  onLoad: (path: string) => void;
  registerFrame: (path: string, iframe: HTMLIFrameElement | null) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const setIframe = useCallback(
    (node: HTMLIFrameElement | null) => {
      iframeRef.current = node;
      registerFrame(page.path, node);
    },
    [page.path, registerFrame]
  );

  const isCollection = page.kind === "collection";
  const openCollection =
    isCollection && page.collection && onOpenCollection
      ? () => onOpenCollection(page.collection!)
      : null;

  return (
    <div
      className="absolute"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    >
      {/* Title bar above the frame (scales with the canvas). */}
      <div className="absolute -top-14 left-0 flex h-12 w-full items-end justify-between pb-1">
        <span
          className={cn(
            "flex items-center gap-2 truncate text-3xl font-medium",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        >
          {isCollection ? (
            <Table2 className="size-7 shrink-0" />
          ) : (
            <FileText className="size-7 shrink-0" />
          )}
          {page.title}
          <span className="text-muted-foreground/50 truncate text-2xl">
            {page.path}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-5">
          {seoAvailable && onOpenSeo && (
            <button
              type="button"
              data-canvas-no-pan
              onClick={() => onOpenSeo(page.path)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-2xl"
            >
              <Globe className="size-6" />
              SEO
            </button>
          )}
          {openCollection ? (
            <button
              type="button"
              onClick={openCollection}
              data-canvas-no-pan
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-2xl"
            >
              Manage entries
              <ArrowRight className="size-6" />
            </button>
          ) : (
            editHref && (
              <a
                href={editHref}
                data-canvas-no-pan
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-2xl"
              >
                {isCollection ? (
                  <>
                    Manage entries
                    <ArrowRight className="size-6" />
                  </>
                ) : (
                  <>
                    <PencilLine className="size-6" />
                    Edit form
                  </>
                )}
              </a>
            )
          )}
        </span>
      </div>

      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-md bg-white shadow-sm ring-1 transition-shadow",
          engaged
            ? "ring-primary shadow-xl ring-4"
            : selected
              ? "ring-primary/70 ring-4"
              : "ring-border"
        )}
      >
        {isCollection ? (
          /* Collection card: no iframe — this page is a CMS table, opened in
             the CMS overlay, not inline on the canvas. */
          (() => {
            const cardBody = (
              <>
                <Table2 className="text-muted-foreground size-24" />
                <div className="flex flex-col gap-2">
                  <span className="text-foreground text-4xl font-medium">
                    Linked to a CMS table
                  </span>
                  <span className="text-muted-foreground text-2xl">
                    Entries live in the CMS, not on the canvas.
                  </span>
                </div>
                <span className="text-primary inline-flex items-center gap-2 text-3xl font-medium">
                  Manage entries
                  <ArrowRight className="size-7" />
                </span>
              </>
            );
            const cardClass =
              "bg-muted/20 hover:bg-muted/40 absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center transition-colors";
            return openCollection ? (
              <button
                type="button"
                onClick={openCollection}
                data-canvas-no-pan
                className={cardClass}
              >
                {cardBody}
              </button>
            ) : (
              <a
                href={editHref ?? undefined}
                data-canvas-no-pan
                className={cardClass}
              >
                {cardBody}
              </a>
            );
          })()
        ) : (
          <>
        {/* Placeholder card — always rendered so unloaded frames have shape. */}
        <div
          className="bg-muted/30 absolute inset-0 flex flex-col gap-6 p-10"
          style={{ contain: "strict" }}
        >
          <div className="bg-muted h-16 w-1/2 rounded" />
          <div className="bg-muted/70 h-8 w-2/3 rounded" />
          <div className="bg-muted/70 h-8 w-1/2 rounded" />
          <div className="bg-muted/50 mt-auto h-40 w-full rounded" />
        </div>

        {mounted && (
          <iframe
            ref={setIframe}
            src={editSrc}
            title={page.title}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            onLoad={() => onLoad(page.path)}
            onError={() => onLoad(page.path)}
          />
        )}

        {/* Hit overlay: removed only while engaged. */}
        {!engaged && (
          <div
            className="absolute inset-0"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(page.path);
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (mounted) onEngage(page.path);
            }}
          >
            {selected && mounted && (
              <span className="bg-primary text-primary-foreground absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-2xl font-medium shadow-lg">
                Double-click to edit
              </span>
            )}
          </div>
        )}
        {engaged && (
          <span className="bg-foreground/80 text-background pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-2xl font-medium shadow-lg">
            Click any text to edit — Esc to exit
          </span>
        )}
          </>
        )}
      </div>
    </div>
  );
});
