"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Editor } from "./components/editor";
import { ElementResetButton } from "./components/element-reset-button";
import { Inspector } from "./components/inspector";
import { NotePopup } from "./components/note-popup";
import { Toast } from "./components/toast";
import { Toolbar } from "./components/toolbar";
import { ViewPanel } from "./components/view-panel";
import { useElementSelector } from "./hooks/use-element-selector";
import { useFeedback } from "./hooks/use-feedback";
import { useLocalStorageFlag } from "./hooks/use-local-storage";
import type { Change, DevToolsProps, DevToolsState, ElementRect } from "./types";
import { copyFeedbackToClipboard } from "./utils/clipboard";
import {
  getCssSelector,
  getElementLabel,
  isDevToolsElement,
} from "./utils/element-info";
import { KEYFRAMES } from "./utils/styles";

const DEFAULT_REQUEST_URL = "https://portal.alisamadii.com/requests";

export function DevTools({
  storageKey = "devtools-enabled",
  position = "bottom-right",
  zIndex = 99999,
  requestUrl = DEFAULT_REQUEST_URL,
}: DevToolsProps) {
  const [enabled, setEnabled] = useLocalStorageFlag(storageKey);
  const [state, setState] = useState<DevToolsState>("hidden");
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "warning";
    linkUrl?: string;
    linkText?: string;
  } | null>(null);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [highlightedRect, setHighlightedRect] = useState<ElementRect | null>(
    null
  );
  const stylesInjected = useRef(false);

  const feedback = useFeedback();
  const feedbackResetRef = useRef(feedback.reset);
  feedbackResetRef.current = feedback.reset;

  const inspector = useElementSelector(state === "inspecting");

  // Inject keyframe styles once
  useEffect(() => {
    if (stylesInjected.current) return;
    if (typeof document === "undefined") return;

    const existing = document.querySelector("[data-devtools-styles]");
    if (existing) return;

    const style = document.createElement("style");
    style.setAttribute("data-devtools-styles", "");
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
    stylesInjected.current = true;

    return () => {
      style.remove();
      stylesInjected.current = false;
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-apply outlines to persisted elements on mount/page load
  useEffect(() => {
    if (!mounted || !enabled) return;

    feedback.changes.forEach((change) => {
      const el = document.querySelector(change.selector);
      if (el) {
        (el as HTMLElement).style.outline =
          "2px solid rgba(59, 130, 246, 0.5)";
        (el as HTMLElement).style.outlineOffset = "2px";
      }
    });
  }, [mounted, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync enabled ↔ state
  useEffect(() => {
    if (enabled && state === "hidden") {
      setState("inspecting");
    } else if (!enabled && state !== "hidden") {
      setState("hidden");
      feedbackResetRef.current();
      setSelectedElement(null);
    }
  }, [enabled, state]);

  // React to element selection from inspector — create a Change immediately
  const MAX_FEEDBACK = 5;

  useEffect(() => {
    if (inspector.selectedElement) {
      const el = inspector.selectedElement;
      const selector = getCssSelector(el);
      const existing = feedback.changes.find((c) => c.selector === selector);

      // Block new feedback if at limit (allow re-selecting existing ones)
      if (!existing && feedback.changes.length >= MAX_FEEDBACK) {
        setToast({
          message: `Limit reached (${MAX_FEEDBACK}). Copy feedback & create a ClickUp task, then reset to continue.`,
          variant: "warning",
        });
        inspector.clearSelection();
        return;
      }

      setSelectedElement(el);
      setState("editing");

      if (!existing) {
        const isImage = el.tagName.toLowerCase() === "img";
        feedback.addChange({
          id: "",
          selector,
          element: getElementLabel(el),
          type: isImage ? "image" : "text",
          original: isImage
            ? (el as HTMLImageElement).src
            : (el.textContent || "").trim().slice(0, 200),
          modified: "",
          note: "",
        });
      }

      inspector.clearSelection();
    }
  }, [inspector.selectedElement, inspector.clearSelection]);

  // Intercept <a> tag navigation while devtools active
  useEffect(() => {
    if (state === "hidden") return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isDevToolsElement(target)) return;
      const anchor = target.closest("a");
      if (anchor) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [state]);

  const handleHide = useCallback(() => {
    feedbackResetRef.current();
    setSelectedElement(null);
    setEnabled(null);
  }, [setEnabled]);

  const handleStartInspecting = useCallback(() => {
    setState((s) => (s === "inspecting" ? "idle" : "inspecting"));
    setSelectedElement(null);
    setHighlightedRect(null);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedElement(null);
    setState("inspecting");
  }, []);

  const handleCopyFeedback = useCallback(async () => {
    const payload = feedback.getPayload();
    const success = await copyFeedbackToClipboard(payload);

    if (success) {
      setToast({
        message: "Feedback copied!",
        variant: "success",
        linkUrl: requestUrl,
        linkText: "Submit here →",
      });
    } else {
      setToast({ message: "Failed to copy — try again", variant: "warning" });
    }
  }, [feedback, requestUrl]);

  const handleReset = useCallback(() => {
    feedbackResetRef.current();
    setSelectedElement(null);
    setState("inspecting");
  }, []);

  const handleView = useCallback(() => {
    setState((s) => (s === "viewing" ? "inspecting" : "viewing"));
    setSelectedElement(null);
    setHighlightedRect(null);
  }, []);

  const scrollRafRef = useRef(0);

  const handleViewHover = useCallback((change: Change | null) => {
    cancelAnimationFrame(scrollRafRef.current);

    if (!change) {
      setHighlightedRect(null);
      return;
    }
    const el = document.querySelector(change.selector);
    if (!el) {
      setHighlightedRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    let frames = 0;
    const updateRect = () => {
      const r = el.getBoundingClientRect();
      setHighlightedRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
      frames++;
      if (frames < 60) {
        scrollRafRef.current = requestAnimationFrame(updateRect);
      }
    };
    updateRect();
  }, []);

  const handleDeleteChange = useCallback(
    (changeId: string) => {
      feedback.resetElement(changeId);
    },
    [feedback.resetElement]
  );

  const handleSaveNote = useCallback(
    (note: string) => {
      if (selectedElement) {
        const selector = getCssSelector(selectedElement);
        const change = feedback.changes.find((c) => c.selector === selector);
        if (change) {
          feedback.updateNote(change.id, note);
        }
      }
      setSelectedElement(null);
      setState("inspecting");
    },
    [selectedElement, feedback.changes, feedback.updateNote]
  );

  const handleNoteClose = useCallback(() => {
    if (selectedElement) {
      const selector = getCssSelector(selectedElement);
      const change = feedback.changes.find((c) => c.selector === selector);
      if (change && !change.note && !change.modified) {
        feedback.resetElement(change.id);
      }
    }
    setSelectedElement(null);
    setState("inspecting");
  }, [selectedElement, feedback.changes, feedback.resetElement]);

  const handleElementReset = useCallback(() => {
    if (selectedElement) {
      const selector = getCssSelector(selectedElement);
      const change = feedback.changes.find((c) => c.selector === selector);
      if (change) {
        feedback.resetElement(change.id);
      }
    }
    setSelectedElement(null);
    setState("inspecting");
  }, [selectedElement, feedback.changes, feedback.resetElement]);

  if (!mounted || !enabled || typeof window === "undefined") return null;

  const showToolbar = state !== "hidden";
  const showInspector = state === "inspecting";

  return createPortal(
    <div data-devtools-ignore>
      {showToolbar && (
        <Toolbar
          state={state}
          changesCount={feedback.changes.length}
          onSelectElement={handleStartInspecting}
          onCopyFeedback={handleCopyFeedback}
          onView={handleView}
          onReset={handleReset}
          onHide={handleHide}
          onBack={handleBack}
          isViewing={state === "viewing"}
          requestUrl={requestUrl}
          zIndex={zIndex}
          position={position}
        />
      )}

      {showInspector && (
        <Inspector
          rect={inspector.rect}
          label={inspector.label}
          zIndex={zIndex}
        />
      )}

      {highlightedRect && state === "viewing" && (
        <Inspector rect={highlightedRect} label="" zIndex={zIndex} />
      )}

      {selectedElement && state === "editing" && (
        <>
          <Editor
            element={selectedElement}
            onTrackOriginal={feedback.trackOriginal}
            onAddChange={feedback.addChange}
          />
          <NotePopup
            element={selectedElement}
            initialNote={
              feedback.changes.find(
                (c) => c.selector === getCssSelector(selectedElement)
              )?.note ?? ""
            }
            onSave={handleSaveNote}
            onClose={handleNoteClose}
            zIndex={zIndex}
          />
          <ElementResetButton
            element={selectedElement}
            onReset={handleElementReset}
            zIndex={zIndex}
          />
        </>
      )}

      {state === "viewing" && (
        <ViewPanel
          changes={feedback.changes}
          onDelete={handleDeleteChange}
          onHover={handleViewHover}
          zIndex={zIndex}
          position={position}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={toast.linkUrl ? 6000 : toast.variant === "warning" ? 5000 : 3000}
          linkUrl={toast.linkUrl}
          linkText={toast.linkText}
          onDone={() => setToast(null)}
          zIndex={zIndex}
          position={position}
        />
      )}
    </div>,
    document.body
  );
}
