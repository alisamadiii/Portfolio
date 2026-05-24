import React from "react";

import type { ElementRect } from "../types";
import { styles } from "../utils/styles";

interface InspectorProps {
  rect: ElementRect | null;
  label: string;
  zIndex: number;
}

export function Inspector({ rect, label, zIndex }: InspectorProps) {
  if (!rect) return null;

  const labelTop = rect.top - 28;
  const showLabelAbove = labelTop > 8;

  return (
    <>
      {/* Highlight rectangle */}
      <div
        data-devtools-ignore
        style={{
          ...styles.highlightRect,
          zIndex: zIndex - 1,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />

      {/* Element label */}
      {label && (
        <div
          data-devtools-ignore
          style={{
            ...styles.elementLabel,
            zIndex: zIndex - 1,
            left: rect.left,
            top: showLabelAbove ? labelTop : rect.top + rect.height + 4,
          }}
        >
          {label}
        </div>
      )}
    </>
  );
}
