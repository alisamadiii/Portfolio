import { useCallback, useEffect, useRef, useState } from "react";

import type { Change, PersistedFeedback } from "../types";

const STORAGE_PREFIX = "devtools-feedback";

function getStorageKey(): string {
  return `${STORAGE_PREFIX}-${window.location.pathname}`;
}

function loadPersisted(): PersistedFeedback | null {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persist(data: PersistedFeedback): void {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  } catch {
    /* quota exceeded */
  }
}

function clearPersisted(): void {
  localStorage.removeItem(getStorageKey());
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useFeedback() {
  const [changes, setChanges] = useState<Change[]>(() => {
    if (typeof window === "undefined") return [];
    return loadPersisted()?.changes ?? [];
  });
  const originalsRef = useRef<
    Map<Element, { type: "text" | "image"; value: string }>
  >(new Map());

  useEffect(() => {
    persist({ changes });
  }, [changes]);

  const trackOriginal = useCallback(
    (element: Element, type: "text" | "image", value: string) => {
      if (!originalsRef.current.has(element)) {
        originalsRef.current.set(element, { type, value });
      }
    },
    []
  );

  const addChange = useCallback((change: Change) => {
    setChanges((prev) => {
      const existing = prev.findIndex(
        (c) => c.selector === change.selector && c.type === change.type
      );
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { ...change, id: prev[existing].id };
        return updated;
      }
      return [...prev, { ...change, id: change.id || generateId() }];
    });
  }, []);

  const removeChange = useCallback((changeId: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== changeId));
  }, []);

  const updateNote = useCallback((changeId: string, note: string) => {
    setChanges((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, note } : c))
    );
  }, []);

  const resetElement = useCallback(
    (changeId: string) => {
      const change = changes.find((c) => c.id === changeId);
      if (!change) return;

      const el = document.querySelector(change.selector);
      if (el) {
        if (change.modified) {
          const original = originalsRef.current.get(el);
          if (original) {
            if (original.type === "text") {
              el.textContent = original.value;
            } else if (original.type === "image") {
              (el as HTMLImageElement).src = original.value;
            }
          }
        }
        originalsRef.current.delete(el);
        (el as HTMLElement).contentEditable = "false";
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
        (el as HTMLElement).style.cursor = "";
      }

      setChanges((prev) => prev.filter((c) => c.id !== changeId));
    },
    [changes]
  );

  const getPayload = useCallback(() => {
    return {
      url: window.location.href,
      path: window.location.pathname,
      changes,
      timestamp: new Date().toISOString(),
    };
  }, [changes]);

  const reset = useCallback(() => {
    originalsRef.current.forEach((original, element) => {
      const change = changes.find(
        (c) => document.querySelector(c.selector) === element
      );
      if (change?.modified) {
        if (original.type === "text") {
          element.textContent = original.value;
        } else if (original.type === "image") {
          (element as HTMLImageElement).src = original.value;
        }
      }
      (element as HTMLElement).contentEditable = "false";
      (element as HTMLElement).style.outline = "";
      (element as HTMLElement).style.outlineOffset = "";
      (element as HTMLElement).style.cursor = "";
    });
    originalsRef.current.clear();

    changes.forEach((change) => {
      const el = document.querySelector(change.selector);
      if (el) {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
        (el as HTMLElement).contentEditable = "false";
        (el as HTMLElement).style.cursor = "";
      }
    });

    setChanges([]);
    clearPersisted();
  }, [changes]);

  return {
    changes,
    trackOriginal,
    addChange,
    removeChange,
    updateNote,
    resetElement,
    getPayload,
    reset,
  };
}
