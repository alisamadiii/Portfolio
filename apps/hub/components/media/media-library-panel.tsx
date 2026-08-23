"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, X } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";

import { useConfig } from "@/contexts/config-context";

import { ImageKitLibraryPanel } from "@/components/media/imagekit-widget";
import { MediaLibraryContext } from "@/components/media/media-library-context";

type MediaRequest = {
  onInsert: (urls: string[]) => void;
  maxSelected?: number;
  title?: string;
};

/**
 * The single global media library dialog for the whole CMS. Any field or the
 * canvas opens it through `useMediaLibrary().open({ onInsert })`; the ImageKit
 * library is embedded inline in a centered modal. Pick an image, hit the
 * library's Insert button — the URLs flow to the opener's `onInsert` and the
 * dialog closes. Mounted once under the repo layout.
 */
export const MediaLibraryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { config } = useConfig();
  const isHostedMedia =
    !!config?.mediaSettings && config.mediaSettings.provider !== "github";

  const [request, setRequest] = useState<MediaRequest | null>(null);

  const open = useCallback((next: MediaRequest) => setRequest(next), []);
  const close = useCallback(() => setRequest(null), []);

  const value = useMemo(
    () => ({ isAvailable: isHostedMedia, open, close }),
    [isHostedMedia, open, close]
  );

  return (
    <MediaLibraryContext.Provider value={value}>
      {children}
      {request && (
        <MediaLibraryDialog
          title={request.title ?? "Media library"}
          onInsert={(urls) => {
            request.onInsert(urls);
            close();
          }}
          onClose={close}
        />
      )}
    </MediaLibraryContext.Provider>
  );
};

/**
 * Centered dialog with the ImageKit library embedded inline (not the widget's
 * own fullscreen modal). Backdrop click / X / Escape close it. z-[70] so it
 * floats above slide-over sheets (z-50).
 */
function MediaLibraryDialog({
  title,
  onInsert,
  onClose,
}: {
  title: string;
  onInsert: (urls: string[]) => void;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Capture phase so a host surface's own Escape handler (canvas frame,
  // sheet) doesn't also fire while the dialog is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="bg-background relative flex h-[min(44rem,85vh)] w-[min(70rem,92vw)] flex-col overflow-hidden rounded-xl border shadow-2xl">
        <div className="bg-muted/40 flex h-11 shrink-0 items-center gap-2 border-b px-4">
          <FolderOpen className="text-muted-foreground size-4" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {title}
          </span>
          <span className="text-muted-foreground hidden text-xs sm:block">
            Select an image, then press Insert
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close media library"
          >
            <X className="size-3.5" />
          </Button>
        </div>
        <ImageKitLibraryPanel onInsert={onInsert} />
      </div>
    </div>
  );
}
