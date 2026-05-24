import React from "react";

import { styles } from "../utils/styles";

interface IndicatorProps {
  onClick: () => void;
  onHide: () => void;
  zIndex: number;
  position: "bottom-right" | "bottom-left";
}

export function Indicator({ onClick, onHide, zIndex, position }: IndicatorProps) {
  const positionStyle =
    position === "bottom-left"
      ? { left: 16, right: "auto" }
      : { right: 16, left: "auto" };

  return (
    <div
      data-devtools-ignore
      style={{
        ...styles.indicator,
        ...positionStyle,
        zIndex,
        animation: "devtools-fade-in 200ms ease forwards",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "rgba(10, 10, 10, 0.95)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "rgba(10, 10, 10, 0.85)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      <div style={styles.indicatorDot} />
      <span
        onClick={onClick}
        style={{ cursor: "pointer", padding: "2px 4px" }}
      >
        Feedback
      </span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          onHide();
        }}
        style={{
          marginLeft: 4,
          padding: "2px 4px",
          cursor: "pointer",
          color: "#666",
          fontSize: 14,
          lineHeight: 1,
        }}
        title="Hide devtools"
      >
        ×
      </span>
    </div>
  );
}
