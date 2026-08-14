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

// The widget ships its modal with `z-index: 1` (would sit under the CMS
// chrome — dialogs use z-50) and a windowed layout with a visible backdrop.
// Clicking the backdrop closes the widget WITHOUT firing the callback (so the
// clipboard-assisted Link flow never runs) — make the modal fullscreen so
// there is no backdrop to click and closing always goes through the widget's
// own Close button.
const MODAL_STYLE_FIX = `
  .ik-media-library-widget-modal {
    z-index: 60 !important;
    padding-top: 0 !important;
  }
  .ik-media-library-widget-modal-content {
    width: 100% !important;
    height: 100% !important;
    border: none !important;
  }
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
  onClose,
  maxSelected,
  children,
}: {
  onSubmit: (urls: string[]) => void;
  onClose?: () => void;
  maxSelected?: number;
  children: ReactElement<{ onClick?: () => void }>;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ImagekitMediaLibraryWidget | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
          if (payload?.eventType === "CLOSE_MEDIA_LIBRARY_WIDGET") {
            onCloseRef.current?.();
            return;
          }
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
      <style>{MODAL_STYLE_FIX}</style>
      {/* The widget appends its (position: fixed) modal INSIDE this container —
          it must not be `hidden` or the modal can never show. Empty div, zero
          footprint in the layout. */}
      <div ref={containerRef} />
      {cloneElement(children, { onClick: () => void handleOpen() })}
    </>
  );
};

/**
 * Inline library for the entry-page split panel: embedded next to the form
 * with the Insert button enabled. `INSERT` routes the selected assets' URLs
 * to the active field (the panel owner swaps `onInsert` when another field
 * takes over — one widget instance lives for the whole panel mount).
 *
 * No `maxFiles`: the widget config is fixed at instantiation but the active
 * field changes — fields clamp selections themselves.
 */
const ImageKitLibraryPanel = ({
  onInsert,
}: {
  onInsert: (urls: string[]) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ImagekitMediaLibraryWidget | null>(null);
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

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
            multiple: true,
            toolbar: { showInsertButton: true, showCloseButton: false },
          },
        },
        (payload: WidgetPayload) => {
          if (payload?.eventType !== "INSERT") return;
          const urls = (payload.data ?? [])
            .map((asset) => asset?.url)
            .filter((url): url is string => typeof url === "string" && !!url);
          if (urls.length) onInsertRef.current(urls);
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

export { ImageKitLibraryDialog, ImageKitLibraryInline, ImageKitLibraryPanel };
