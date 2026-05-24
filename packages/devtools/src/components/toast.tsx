import React, { useEffect, useState } from "react";

import { styles } from "../utils/styles";

export type ToastVariant = "success" | "warning";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  linkUrl?: string;
  linkText?: string;
  onDone: () => void;
  zIndex: number;
  position: "bottom-right" | "bottom-left";
}

const warningStyle = {
  background: "rgba(251, 146, 60, 0.15)",
  border: "1px solid rgba(251, 146, 60, 0.4)",
  color: "#c2410c",
};

export function Toast({
  message,
  variant = "success",
  duration = 3000,
  linkUrl,
  linkText,
  onDone,
  zIndex,
  position,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  const positionStyle =
    position === "bottom-left"
      ? { left: 16, right: "auto" }
      : { right: 16, left: "auto" };

  const isWarning = variant === "warning";

  return (
    <div
      data-devtools-ignore
      style={{
        ...styles.toast,
        ...positionStyle,
        ...(isWarning ? warningStyle : {}),
        zIndex: zIndex + 1,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        animation: isWarning
          ? "devtools-shake 0.5s ease"
          : "devtools-fade-in 200ms ease forwards",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span>{isWarning ? "⚠" : "✓"}</span>
      <span>{message}</span>
      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-devtools-ignore
          style={{
            color: "inherit",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {linkText || "Submit here →"}
        </a>
      )}
    </div>
  );
}
