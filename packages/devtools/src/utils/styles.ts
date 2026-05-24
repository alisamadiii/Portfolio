import type { CSSProperties } from "react";

export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

// Using shadcn CSS variables for automatic dark/light theme support.
// These resolve from the host app's globals.css (:root / .dark).
const v = {
  bg: "var(--card)",
  fg: "var(--card-foreground)",
  muted: "var(--muted)",
  mutedFg: "var(--muted-foreground)",
  border: "var(--border)",
  primary: "var(--primary)",
  primaryFg: "var(--primary-foreground)",
  accent: "var(--accent)",
  accentFg: "var(--accent-foreground)",
};

export const styles = {
  toolbar: {
    position: "fixed",
    bottom: 16,
    right: 16,
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: 4,
    borderRadius: 12,
    background: v.bg,
    border: `1px solid ${v.border}`,
    color: v.fg,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04)",
    lineHeight: 1,
  } satisfies CSSProperties,

  toolbarButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: v.mutedFg,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    cursor: "pointer",
    transition: "all 150ms ease",
    whiteSpace: "nowrap",
    lineHeight: 1,
  } satisfies CSSProperties,

  toolbarButtonActive: {
    background: v.accent,
    color: v.accentFg,
  } satisfies CSSProperties,

  toolbarButtonHover: {
    background: v.accent,
    color: v.accentFg,
  },

  toolbarDivider: {
    width: 1,
    height: 20,
    background: v.border,
    margin: "0 2px",
  } satisfies CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 999,
    background: v.primary,
    color: v.primaryFg,
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1,
  } satisfies CSSProperties,

  highlightRect: {
    position: "fixed",
    pointerEvents: "none",
    border: "2px solid rgba(59, 130, 246, 0.6)",
    background: "rgba(59, 130, 246, 0.08)",
    borderRadius: 4,
    transition: "all 60ms ease-out",
  } satisfies CSSProperties,

  elementLabel: {
    position: "fixed",
    pointerEvents: "none",
    padding: "4px 8px",
    borderRadius: 6,
    background: v.bg,
    border: `1px solid ${v.border}`,
    color: v.primary,
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: 500,
    whiteSpace: "nowrap",
    lineHeight: 1,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  } satisfies CSSProperties,

  toast: {
    position: "fixed",
    bottom: 72,
    right: 16,
    padding: "10px 16px",
    borderRadius: 10,
    background: v.bg,
    border: `1px solid ${v.border}`,
    color: v.fg,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    transition: "all 300ms ease",
    lineHeight: 1.4,
  } satisfies CSSProperties,

  primaryButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: v.primary,
    color: v.primaryFg,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 150ms ease",
    lineHeight: 1,
  } satisfies CSSProperties,

  secondaryButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    border: `1px solid ${v.border}`,
    background: v.muted,
    color: v.mutedFg,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 150ms ease",
    lineHeight: 1,
  } satisfies CSSProperties,

  viewPanel: {
    position: "fixed",
    bottom: 64,
    right: 16,
    width: 320,
    maxHeight: 400,
    overflowY: "auto",
    padding: 12,
    borderRadius: 12,
    background: v.bg,
    border: `1px solid ${v.border}`,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
    fontFamily: FONT_FAMILY,
    color: v.fg,
    animation: "devtools-slide-up 200ms ease forwards",
  } satisfies CSSProperties,

  viewPanelItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "8px 10px",
    borderRadius: 8,
    background: "transparent",
    marginBottom: 4,
    cursor: "default",
    transition: "background 150ms ease",
  } satisfies CSSProperties,

  viewPanelItemHover: {
    background: v.accent,
  } satisfies CSSProperties,

  notePopup: {
    position: "fixed",
    width: 280,
    padding: 12,
    borderRadius: 10,
    background: v.bg,
    border: `1px solid ${v.border}`,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
    fontFamily: FONT_FAMILY,
    color: v.fg,
    animation: "devtools-fade-in 150ms ease forwards",
  } satisfies CSSProperties,

  noteTextarea: {
    width: "100%",
    height: 60,
    padding: 8,
    borderRadius: 6,
    border: `1px solid ${v.border}`,
    background: v.muted,
    color: v.fg,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  } satisfies CSSProperties,

  resetButton: {
    position: "fixed",
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: `1px solid ${v.border}`,
    background: "rgba(239, 68, 68, 0.9)",
    color: "#fff",
    fontSize: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    transition: "all 150ms ease",
  } satisfies CSSProperties,
} as const;

export const KEYFRAMES = `
@keyframes devtools-fade-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes devtools-fade-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(8px) scale(0.96); }
}
@keyframes devtools-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes devtools-slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes devtools-shake {
  0%, 100% { transform: translateX(0); }
  10%, 50%, 90% { transform: translateX(-4px); }
  30%, 70% { transform: translateX(4px); }
}
`;
