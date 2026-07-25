"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
} from "react";

import type { ImagekitMediaLibraryWidget } from "imagekit-media-library-widget";

/**
 * ImageKit Media Library Widget embed.
 *
 * Users sign in to their own ImageKit account inside the widget — no API keys
 * involved. Selection ("Insert") returns absolute CDN URLs which the fields
 * store verbatim (the existing external-URL path).
 *
 * The widget needs third-party cookies for its login iframe (may not work in
 * incognito / strict privacy modes).
 */

type WidgetPayload = {
  eventType?: string;
  data?: Array<{ url?: string }>;
};

// The widget ships its modal with `z-index: 1`, which would sit under the CMS
// chrome. Lift it above everything (dialogs use z-50).
const Z_INDEX_FIX = `
  .ik-media-library-widget-modal { z-index: 60 !important; }
`;

const loadWidget = async () => {
  // Dynamic import: the library builds DOM at instantiation time — keep it
  // out of the server bundle.
  const mod = await import("imagekit-media-library-widget");
  return mod.ImagekitMediaLibraryWidget;
};

/**
 * Modal picker for fields. Renders its trigger child; on click opens the
 * ImageKit library, and calls `onSubmit` with the selected assets' URLs.
 */
const ImageKitLibraryDialog = ({
  onSubmit,
  maxSelected,
  children,
}: {
  onSubmit: (urls: string[]) => void;
  maxSelected?: number;
  children: ReactElement<{ onClick?: () => void }>;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ImagekitMediaLibraryWidget | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, []);

  const handleOpen = useCallback(async () => {
    if (!containerRef.current) return;

    const multiple = maxSelected !== 1;
    const maxFiles =
      multiple && typeof maxSelected === "number" && Number.isFinite(maxSelected)
        ? maxSelected
        : undefined;

    if (!widgetRef.current) {
      const Widget = await loadWidget();
      widgetRef.current = new Widget(
        {
          container: containerRef.current,
          view: "modal",
          renderOpenButton: false,
          mlSettings: {
            multiple,
            ...(maxFiles ? { maxFiles } : {}),
            toolbar: { showInsertButton: true, showCloseButton: true },
          },
        },
        (payload: WidgetPayload) => {
          if (payload?.eventType !== "INSERT") return;
          const urls = (payload.data ?? [])
            .map((asset) => asset?.url)
            .filter((url): url is string => typeof url === "string" && !!url);
          if (urls.length) onSubmitRef.current(urls);
        }
      );
    }
    widgetRef.current.open();
  }, [maxSelected]);

  return (
    <>
      <style>{Z_INDEX_FIX}</style>
      {/* The widget appends its (position: fixed) modal INSIDE this container —
          it must not be `hidden` or the modal can never show. Empty div, zero
          footprint in the layout. */}
      <div ref={containerRef} />
      {cloneElement(children, { onClick: () => void handleOpen() })}
    </>
  );
};

/**
 * Inline library for the media page: the full ImageKit DAM embedded in the
 * page (browse, upload, delete happen inside the widget). Management-only —
 * the Insert toolbar button is hidden.
 */
const ImageKitLibraryInline = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ImagekitMediaLibraryWidget | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || widgetRef.current) return;
      const Widget = await loadWidget();
      if (cancelled || !containerRef.current) return;
      widgetRef.current = new Widget(
        {
          container: containerRef.current,
          view: "inline",
          renderOpenButton: false,
          dimensions: { height: "100%", width: "100%" },
          mlSettings: {
            toolbar: { showInsertButton: false, showCloseButton: false },
          },
        },
        () => {
          // Management-only view: nothing to insert.
        }
      );
    })();

    return () => {
      cancelled = true;
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full min-h-0 flex-1" />;
};

export { ImageKitLibraryDialog, ImageKitLibraryInline };
