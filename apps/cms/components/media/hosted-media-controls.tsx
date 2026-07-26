"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FolderOpen } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import { isAbsoluteMediaUrl } from "@/lib/utils/file";

import { ImageKitLibraryDialog } from "@/components/media/imagekit-widget";
import { useMediaLibrary } from "@/components/media/media-library-context";
import { UrlInput, UrlPopover } from "@/components/media/url-popover";

/**
 * Hosted-media (e.g. ImageKit) add-controls for image/file fields: the
 * "Media library" button plus the URL entry.
 *
 * On wide screens the button opens the entry-page split panel (see
 * `MediaLibraryProvider`) and an inline URL input appears right away — copy a
 * URL in the library, click back, and it's pre-filled from the clipboard. On
 * narrow screens it falls back to the fullscreen modal, where closing the
 * widget pre-fills the Link popover instead (the original flow).
 */
const HostedMediaControls = ({
  files,
  maxSelected,
  onSelected,
  submitLabel,
  placeholder,
}: {
  /** Current field paths — clipboard URLs already present are ignored. */
  files: string[];
  maxSelected?: number;
  onSelected: (urls: string[]) => void;
  submitLabel: string;
  placeholder: string;
}) => {
  const fieldId = useId();
  const { isAvailable, activeFieldId, open, close } = useMediaLibrary();
  const isActive = activeFieldId === fieldId;

  const onSelectedRef = useRef(onSelected);
  onSelectedRef.current = onSelected;
  const filesRef = useRef(files);
  filesRef.current = files;

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [prefillUrl, setPrefillUrl] = useState("");

  // Fullscreen-modal fallback: closing the widget checks the clipboard for a
  // copied asset URL and pre-fills the Link popover so the user only confirms.
  const [linkPopover, setLinkPopover] = useState({ open: false, url: "" });

  const readClipboardUrl = useCallback(async (): Promise<string | null> => {
    let text = "";
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      // Permission denied or unsupported (e.g. Safari without a user
      // gesture) — manual paste still works.
      return null;
    }
    if (!isAbsoluteMediaUrl(text)) return null;
    if (filesRef.current.includes(text)) return null;
    return text;
  }, []);

  const handleDialogClose = useCallback(async () => {
    const url = await readClipboardUrl();
    if (url) setLinkPopover({ open: true, url });
  }, [readClipboardUrl]);

  const handleOpenPanel = useCallback(() => {
    open({ fieldId, onInsert: (urls) => onSelectedRef.current(urls) });
    setShowUrlInput(true);
  }, [open, fieldId]);

  // Focus returning to the page (from the ImageKit iframe or another tab)
  // means the user may have just copied a URL — pre-fill the visible input.
  useEffect(() => {
    if (!showUrlInput) return;
    const onFocus = () => {
      void readClipboardUrl().then((url) => {
        if (url) setPrefillUrl(url);
      });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [showUrlInput, readClipboardUrl]);

  // Panel closed or retargeted to another field: one final clipboard read
  // into the (still visible) input.
  const prevActiveRef = useRef(isActive);
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (!wasActive || isActive || !showUrlInput) return;
    void readClipboardUrl().then((url) => {
      if (url) setPrefillUrl(url);
    });
  }, [isActive, showUrlInput, readClipboardUrl]);

  // Close the panel when this field unmounts while driving it — covers the
  // single-file case where an insert fills the slot and removes the controls.
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    return () => {
      if (isActiveRef.current) closeRef.current();
    };
  }, []);

  const hideUrlInput = useCallback(() => {
    setShowUrlInput(false);
    setPrefillUrl("");
  }, []);

  const trigger = (
    <Button type="button" size="sm" variant="outline">
      <FolderOpen />
      Media library
    </Button>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isAvailable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleOpenPanel}
          >
            <FolderOpen />
            Media library
          </Button>
        ) : (
          <ImageKitLibraryDialog
            maxSelected={maxSelected}
            onSubmit={(urls) => onSelectedRef.current(urls)}
            onClose={handleDialogClose}
          >
            {trigger}
          </ImageKitLibraryDialog>
        )}
        {!showUrlInput && (
          <UrlPopover
            open={linkPopover.open}
            onOpenChange={(open) =>
              setLinkPopover((prev) => ({ open, url: open ? prev.url : "" }))
            }
            initialUrl={linkPopover.url}
            submitLabel={submitLabel}
            placeholder={placeholder}
            onSubmit={(url) => onSelectedRef.current([url])}
          />
        )}
      </div>
      {showUrlInput && (
        <div className="max-w-sm rounded-md border p-2">
          <UrlInput
            prefillUrl={prefillUrl}
            submitLabel={submitLabel}
            placeholder={placeholder}
            onSubmit={(url) => {
              onSelectedRef.current([url]);
              hideUrlInput();
            }}
            onDismiss={hideUrlInput}
          />
        </div>
      )}
    </div>
  );
};

export { HostedMediaControls };
