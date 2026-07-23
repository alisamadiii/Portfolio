import { useCopy } from "../lib/hooks";
import { CommandChip } from "./CommandChip";

export function FinalCta() {
  const [copiedCta, copyCta] = useCopy();
  return (
    <section
      style={{
        position: "relative",
        background: "#0A0A0A",
        color: "#FAFAFA",
        borderTop: "1px solid #27272A",
        padding: "clamp(96px, 12vw, 160px) 0",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, #27272A 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          opacity: 0.45,
          maskImage:
            "radial-gradient(ellipse 80% 90% at 50% 100%, black 25%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 90% at 50% 100%, black 25%, transparent 75%)",
          pointerEvents: "none",
        }}
      />
      <div
        data-reveal
        style={{
          position: "relative",
          maxWidth: 760,
          margin: "0 auto",
          padding: "0 clamp(20px, 4vw, 32px)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            textWrap: "balance",
          }}
        >
          Stop rebuilding the same boilerplate.
        </h2>
        <p
          style={{
            margin: 0,
            maxWidth: 480,
            color: "#A1A1AA",
            fontSize: 18,
            lineHeight: 1.6,
            textWrap: "pretty",
          }}
        >
          Get the template and ship the part that's actually yours.
        </p>
        <a
          href="#pricing"
          className="btn-white"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#FAFAFA",
            color: "#0A0A0A",
            textDecoration: "none",
            fontSize: 16,
            fontWeight: 500,
            padding: "15px 30px",
            borderRadius: 6,
            minHeight: 44,
            transition: "background 0.2s, transform 0.2s",
          }}
        >
          Get the template
        </a>
        <CommandChip onCopy={copyCta} copied={copiedCta} />
      </div>
    </section>
  );
}
