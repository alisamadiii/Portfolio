"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, X } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";

import { useConfig } from "@/contexts/config-context";

import { ImageKitLibraryPanel } from "@/components/media/imagekit-widget";
import { MediaLibraryContext } from "@/components/media/media-library-context";

/**
 * Owns the entry page's media library split: form left, embedded ImageKit
 * library right, so users can browse/copy side-by-side instead of behind a
 * fullscreen modal. Fields open/retarget the panel through `useMediaLibrary`;
 * the latest opener's `onInsert` receives inserted URLs.
 *
 * Self-disables when the repo has no hosted media provider. Below `lg` the
 * split has no room — `isAvailable` flips false and fields fall back to the
 * fullscreen modal (the panel reappears if the viewport widens again).
 */
export const MediaLibraryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { config } = useConfig();
  const isHostedMedia =
    !!config?.mediaSettings && config.mediaSettings.provider !== "github";

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const onInsertRef = useRef<((urls: string[]) => void) | null>(null);

  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const open = useCallback(
    (request: { fieldId: string; onInsert: (urls: string[]) => void }) => {
      onInsertRef.current = request.onInsert;
      setActiveFieldId(request.fieldId);
    },
    []
  );

  const close = useCallback(() => {
    onInsertRef.current = null;
    setActiveFieldId(null);
  }, []);

  const value = useMemo(
    () => ({
      isAvailable: isHostedMedia && isWide,
      activeFieldId,
      open,
      close,
    }),
    [isHostedMedia, isWide, activeFieldId, open, close]
  );

  const effectiveOpen = activeFieldId !== null && isWide;

  if (!isHostedMedia) {
    return (
      <MediaLibraryContext.Provider value={value}>
        {children}
      </MediaLibraryContext.Provider>
    );
  }

  // The panel group stays mounted with the form always in the left panel and
  // only the library panel toggling (conditional panels need `id` + `order`).
  // Wrapping/unwrapping `children` on open would REMOUNT the form and wipe
  // unsaved react-hook-form state.
  //
  // Same sticky split recipe as the live preview (see preview-panel.tsx):
  // the lib hard-codes `overflow: hidden` + `height: 100%`, which clips
  // the sticky panel on scroll — override inline so the pane stretches
  // with the form column and the panel pins to the viewport.
  return (
    <MediaLibraryContext.Provider value={value}>
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="cms-media-split"
        style={{ overflow: "visible", height: "auto" }}
      >
        <ResizablePanel
          id="entry-form"
          order={1}
          defaultSize={62}
          minSize={35}
          className="min-w-0"
          style={{ overflow: "visible" }}
        >
          {children}
        </ResizablePanel>
        {effectiveOpen && (
          <>
            <ResizableHandle withHandle className="mx-2" />
            <ResizablePanel
              id="media-library"
              order={2}
              defaultSize={38}
              minSize={25}
              style={{ overflow: "visible" }}
            >
              <div className="bg-background sticky top-16 flex h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-xl border shadow-sm">
                <div className="bg-muted/40 flex h-10 shrink-0 items-center gap-2 border-b px-3">
                  <FolderOpen className="text-muted-foreground size-4" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    Media library
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={close}
                    aria-label="Close media library"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                <ImageKitLibraryPanel
                  onInsert={(urls) => onInsertRef.current?.(urls)}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </MediaLibraryContext.Provider>
  );
};
