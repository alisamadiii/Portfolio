import type { CSSProperties, ReactNode } from "react";

import { MONO } from "../lib/constants";

// Content pages (Docs, Changelog, License, Terms) render dark-on-white prose,
// matching the landing's light sections.

export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <header style={{ marginBottom: "clamp(40px, 5vw, 64px)" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: "0.16em",
          color: "#71717A",
          marginBottom: 18,
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          margin: 0,
          fontSize: "clamp(36px, 5vw, 56px)",
          fontWeight: 600,
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
          color: "#0A0A0A",
          textWrap: "balance",
        }}
      >
        {title}
      </h1>
      {lede && (
        <p
          style={{
            margin: "20px 0 0",
            maxWidth: 620,
            color: "#71717A",
            fontSize: "clamp(16px, 1.4vw, 18px)",
            lineHeight: 1.65,
            textWrap: "pretty",
          }}
        >
          {lede}
        </p>
      )}
    </header>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      style={{ marginBottom: "clamp(36px, 4vw, 52px)", scrollMarginTop: 96 }}
    >
      {title && (
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(22px, 2.4vw, 28px)",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "#0A0A0A",
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function P({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        color: "#52525B",
        fontSize: 16,
        lineHeight: 1.7,
        textWrap: "pretty",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        fontFamily: MONO,
        fontSize: 13.5,
        background: "#F4F4F5",
        border: "1px solid #E4E4E7",
        borderRadius: 4,
        padding: "2px 6px",
        color: "#0A0A0A",
      }}
    >
      {children}
    </code>
  );
}

export function CodeBlock({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        margin: "0 0 20px",
      }}
    >
      {title && (
        <div
          style={{
            padding: "11px 18px",
            borderBottom: "1px solid #27272A",
            fontFamily: MONO,
            fontSize: 12,
            color: "#71717A",
          }}
        >
          {title}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: "18px 20px",
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.85,
          color: "#A1A1AA",
          overflowX: "auto",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

export function Bullets({
  items,
  mark = "•",
}: {
  items: ReactNode[];
  mark?: "•" | "✓" | "✗";
}) {
  const markColor =
    mark === "✓" ? "#16A34A" : mark === "✗" ? "#71717A" : "#A1A1AA";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        margin: "0 0 20px",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "baseline",
            color: "#52525B",
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          <span
            style={{
              color: markColor,
              fontFamily: MONO,
              fontSize: 13,
              flex: "none",
            }}
          >
            {mark}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function Divider() {
  return (
    <div style={{ height: 1, background: "#E4E4E7", margin: "0 0 36px" }} />
  );
}
