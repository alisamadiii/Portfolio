import React, { useCallback, useEffect, useRef, useState } from "react";

import type { DevToolsState } from "../types";
import { styles } from "../utils/styles";

interface ToolbarProps {
  state: DevToolsState;
  changesCount: number;
  onSelectElement: () => void;
  onCopyFeedback: () => void;
  onView: () => void;
  onReset: () => void;
  onHide: () => void;
  onBack: () => void;
  isViewing: boolean;
  requestUrl: string;
  zIndex: number;
  position: "bottom-right" | "bottom-left";
}

function ToolbarIcon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function hoverIn(e: React.MouseEvent, overrides?: Record<string, string>) {
  Object.assign(e.currentTarget.style, {
    background: "var(--accent)",
    color: "var(--accent-foreground)",
    ...overrides,
  });
}

function hoverOut(e: React.MouseEvent, overrides?: Record<string, string>) {
  Object.assign(e.currentTarget.style, {
    background: "transparent",
    color: "var(--muted-foreground)",
    ...overrides,
  });
}

function ResetButton({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleClick = useCallback(() => {
    if (confirming) {
      clearTimeout(timerRef.current);
      setConfirming(false);
      onReset();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  }, [confirming, onReset]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <>
      <div style={styles.toolbarDivider} />
      <button
        onClick={handleClick}
        style={{
          ...styles.toolbarButton,
          ...(confirming
            ? { background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }
            : {}),
        }}
        onMouseEnter={(e) => {
          if (!confirming) hoverIn(e, {
            background: "rgba(239, 68, 68, 0.1)",
            color: "#f87171",
          });
        }}
        onMouseLeave={(e) => {
          if (!confirming) hoverOut(e);
        }}
        title={confirming ? "Click again to confirm reset" : "Reset all changes"}
      >
        <ToolbarIcon d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
        {confirming && (
          <span style={{ fontSize: 11 }}>Confirm?</span>
        )}
      </button>
    </>
  );
}

function HideButton({ onHide }: { onHide: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleClick = useCallback(() => {
    if (confirming) {
      clearTimeout(timerRef.current);
      setConfirming(false);
      onHide();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  }, [confirming, onHide]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <button
      onClick={handleClick}
      style={{
        ...styles.toolbarButton,
        ...(confirming
          ? { background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }
          : {}),
      }}
      onMouseEnter={(e) => {
        if (!confirming) hoverIn(e);
      }}
      onMouseLeave={(e) => {
        if (!confirming) hoverOut(e);
      }}
      title={confirming ? "Click again to confirm" : "Hide devtools"}
    >
      <ToolbarIcon d="M18 6L6 18M6 6l12 12" />
      {confirming && <span style={{ fontSize: 11 }}>Confirm?</span>}
    </button>
  );
}

export function Toolbar({
  state,
  changesCount,
  onSelectElement,
  onCopyFeedback,
  onView,
  onReset,
  onHide,
  onBack,
  isViewing,
  requestUrl,
  zIndex,
  position,
}: ToolbarProps) {
  const positionStyle =
    position === "bottom-left"
      ? { left: 16, right: "auto" }
      : { right: 16, left: "auto" };

  const isInspecting = state === "inspecting";

  return (
    <div
      data-devtools-ignore
      style={{
        ...styles.toolbar,
        ...positionStyle,
        zIndex,
        animation: "devtools-fade-in 200ms ease forwards",
      }}
    >
      {/* Back button */}
      {state === "editing" && (
        <button
          onClick={onBack}
          style={styles.toolbarButton}
          onMouseEnter={(e) => hoverIn(e)}
          onMouseLeave={(e) => hoverOut(e)}
          title="Back"
        >
          <ToolbarIcon d="M19 12H5M12 19l-7-7 7-7" />
        </button>
      )}

      {/* Select Element */}
      <button
        onClick={onSelectElement}
        style={{
          ...styles.toolbarButton,
          ...(isInspecting ? styles.toolbarButtonActive : {}),
        }}
        onMouseEnter={(e) => {
          if (!isInspecting) hoverIn(e);
        }}
        onMouseLeave={(e) => {
          if (!isInspecting) hoverOut(e);
        }}
        title="Select an element to edit"
      >
        <ToolbarIcon
          d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"
          size={14}
        />
        Select
      </button>

      <div style={styles.toolbarDivider} />

      {/* View */}
      <button
        onClick={onView}
        style={{
          ...styles.toolbarButton,
          ...(isViewing ? styles.toolbarButtonActive : {}),
        }}
        onMouseEnter={(e) => {
          if (!isViewing) hoverIn(e);
        }}
        onMouseLeave={(e) => {
          if (!isViewing) hoverOut(e);
        }}
        title="View all feedback"
      >
        <ToolbarIcon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" />
        View
        {changesCount > 0 && <span style={styles.badge}>{changesCount}</span>}
      </button>

      <div style={styles.toolbarDivider} />

      {/* Copy Feedback */}
      <button
        onClick={onCopyFeedback}
        style={{
          ...styles.toolbarButton,
          ...(changesCount > 0
            ? { color: "var(--card-foreground)" }
            : { opacity: 0.5, cursor: "default" }),
        }}
        disabled={changesCount === 0}
        onMouseEnter={(e) => {
          if (changesCount > 0) hoverIn(e);
        }}
        onMouseLeave={(e) => {
          if (changesCount > 0)
            hoverOut(e, { color: "var(--card-foreground)" });
        }}
        title="Copy feedback to clipboard"
      >
        <ToolbarIcon d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v1a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" />
        Copy
      </button>

      <div style={styles.toolbarDivider} />

      {/* Submit Request */}
      <a
        href={requestUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-devtools-ignore
        style={{
          ...styles.toolbarButton,
          textDecoration: "none",
          color: "var(--card-foreground)",
        }}
        onMouseEnter={(e) => hoverIn(e)}
        onMouseLeave={(e) =>
          hoverOut(e, { color: "var(--card-foreground)" })
        }
        title="Submit feedback request"
      >
        <ToolbarIcon d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        Submit
      </a>

      {/* Reset with confirmation */}
      {changesCount > 0 && (
        <ResetButton onReset={onReset} />
      )}

      <div style={styles.toolbarDivider} />

      {/* Hide with confirmation */}
      <HideButton onHide={onHide} />
    </div>
  );
}
