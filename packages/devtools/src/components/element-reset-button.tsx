import React, { useEffect, useState } from "react";

import { styles } from "../utils/styles";

interface ElementResetButtonProps {
  element: Element;
  onReset: () => void;
  zIndex: number;
}

export function ElementResetButton({
  element,
  onReset,
  zIndex,
}: ElementResetButtonProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const rect = element.getBoundingClientRect();
      setPos({
        top: rect.top - 10,
        left: rect.right - 10,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [element]);

  if (!pos) return null;

  return (
    <button
      data-devtools-ignore
      onClick={(e) => {
        e.stopPropagation();
        onReset();
      }}
      style={{
        ...styles.resetButton,
        top: pos.top,
        left: pos.left,
        zIndex: zIndex + 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "rgba(239, 68, 68, 1)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "rgba(239, 68, 68, 0.9)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      title="Reset this element"
    >
      ×
    </button>
  );
}
