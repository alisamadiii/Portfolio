"use client";

import { useEffect } from "react";

const MESSAGE =
  "You have unsaved changes. Leave this page without saving a draft?";

/**
 * Warn before losing unsaved edits: a `beforeunload` listener for hard
 * navigations plus a capture-phase click listener that confirms internal
 * link navigations (the App Router has no route-change event). Only active
 * while the form has edits that haven't been saved as a draft — a
 * saved-but-unpublished draft must not guard.
 */
export function useUnsavedChangesGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome requires returnValue to be set to show the prompt.
      event.returnValue = "";
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      // New-tab/window clicks don't navigate this page away.
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(anchor.href, window.location.href);
      // External links trigger a full unload — beforeunload covers those.
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      if (!window.confirm(MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [active]);
}
