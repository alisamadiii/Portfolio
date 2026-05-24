import React, { useState } from "react";

import type { Change } from "../types";
import { styles } from "../utils/styles";

interface ViewPanelProps {
  changes: Change[];
  onDelete: (changeId: string) => void;
  onHover: (change: Change | null) => void;
  zIndex: number;
  position: "bottom-right" | "bottom-left";
}

export function ViewPanel({
  changes,
  onDelete,
  onHover,
  zIndex,
  position,
}: ViewPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const positionStyle =
    position === "bottom-left"
      ? { left: 16, right: "auto" }
      : { right: 16, left: "auto" };

  return (
    <div
      data-devtools-ignore
      style={{
        ...styles.viewPanel,
        ...positionStyle,
        zIndex,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#e5e5e5",
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "var(--card-foreground)" }}>
          Feedback ({changes.length})
        </span>
      </div>

      {changes.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: "var(--muted-foreground)",
            padding: "24px 0",
            textAlign: "center",
          }}
        >
          No changes recorded yet.
          <br />
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            Click any element to start.
          </span>
        </div>
      )}

      {changes.map((change) => (
        <div
          key={change.id}
          data-devtools-ignore
          onMouseEnter={() => {
            setHoveredId(change.id);
            onHover(change);
          }}
          onMouseLeave={() => {
            setHoveredId(null);
            onHover(null);
          }}
          style={{
            ...(styles.viewPanelItem as React.CSSProperties),
            ...(hoveredId === change.id ? styles.viewPanelItemHover : {}),
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "var(--primary)",
                fontSize: 11,
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 240,
              }}
            >
              {change.element}
            </span>
            <button
              data-devtools-ignore
              onClick={(e) => {
                e.stopPropagation();
                onDelete(change.id);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                fontSize: 14,
                padding: "0 2px",
                lineHeight: 1,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#f87171";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#666";
              }}
              title="Remove this feedback"
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            {change.type === "text" ? "Text" : "Image"} change
            {change.modified && change.type === "text" && (
              <span style={{ color: "var(--muted-foreground)" }}>
                {" "}
                — &quot;{change.modified.slice(0, 40)}
                {change.modified.length > 40 ? "..." : ""}&quot;
              </span>
            )}
          </div>

          {change.note && (
            <div
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                fontStyle: "italic",
                marginTop: 2,
              }}
            >
              &quot;{change.note}&quot;
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
