import { CMD, MONO } from "../lib/constants";

export function CommandChip({
  onCopy,
  copied,
}: {
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        background: "#111113",
        border: "1px solid #27272A",
        borderRadius: 6,
        padding: "11px 16px",
        fontFamily: MONO,
        fontSize: 13,
        maxWidth: "100%",
      }}
    >
      <span style={{ color: "#52525B", userSelect: "none" }}>$</span>
      <span
        style={{ color: "#FAFAFA", whiteSpace: "nowrap", overflowX: "auto" }}
      >
        {CMD}
      </span>
      <span
        style={{ width: 1, height: 18, background: "#27272A", flex: "none" }}
      />
      <button
        type="button"
        className="copy-btn"
        onClick={onCopy}
        style={{
          background: "none",
          border: "none",
          color: "#71717A",
          fontFamily: MONO,
          fontSize: 12,
          cursor: "pointer",
          padding: "6px 2px",
          transition: "color 0.2s",
          flex: "none",
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
