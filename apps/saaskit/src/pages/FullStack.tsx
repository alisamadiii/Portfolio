import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";

import { CommandChip } from "../components/CommandChip";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { MONO, TRUST } from "../lib/constants";
import { useCopy, useReveals, useViewport } from "../lib/hooks";
import { container, eyebrow, h2Style } from "../lib/styles";

// Shared code colors — tuned for readability on the near-black panels
const W = "#FAFAFA"; // keywords
const S = "#D4D4D8"; // strings
const CODE = "#E4E4E7"; // base code text
const G = "#8B8B94"; // comments / dim labels (raised for contrast)
const GREEN = "#4ADE80";

/* ------------------------------------------------------------------ */
/* Reusable bits                                                       */
/* ------------------------------------------------------------------ */

/** Dark code panel — looks right on both dark and white bands. */
function CodePanel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #27272A",
          fontFamily: MONO,
          fontSize: 12,
          color: "#71717A",
        }}
      >
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          padding: "20px 22px 24px",
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.7,
          color: CODE,
          overflowX: "auto",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

/** One stop on the journey — alternating dark/white band, text + visual. */
function Stop({
  num,
  light,
  reverse,
  tag,
  title,
  body,
  visual,
}: {
  num: string;
  light?: boolean;
  reverse?: boolean;
  tag: string;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  const muted = light ? "#71717A" : "#A1A1AA";
  return (
    <section
      style={{
        background: light ? "#FFFFFF" : "#0A0A0A",
        color: light ? "#0A0A0A" : "#FAFAFA",
        borderTop: `1px solid ${light ? "#E4E4E7" : "#18181B"}`,
        padding: "clamp(72px, 9vw, 120px) 0",
      }}
    >
      <div
        data-reveal
        style={{
          ...container(),
          display: "flex",
          flexWrap: reverse ? "wrap-reverse" : "wrap",
          flexDirection: reverse ? "row-reverse" : "row",
          alignItems: "center",
          gap: "clamp(36px, 5vw, 80px)",
        }}
      >
        <div style={{ flex: 1, minWidth: "min(100%, 330px)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: "clamp(34px, 4vw, 48px)",
                fontWeight: 600,
                letterSpacing: "-0.04em",
                color: light ? "#E4E4E7" : "#27272A",
                lineHeight: 1,
              }}
            >
              {num}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: "0.16em",
                color: light ? "#71717A" : "#71717A",
              }}
            >
              {tag}
            </span>
          </div>
          <h3
            style={{
              margin: "0 0 14px",
              fontSize: "clamp(26px, 2.8vw, 36px)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              color: muted,
              fontSize: 16.5,
              lineHeight: 1.65,
              textWrap: "pretty",
              maxWidth: 460,
            }}
          >
            {body}
          </p>
        </div>
        <div style={{ flex: 1.15, minWidth: "min(100%, 360px)" }}>{visual}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Visuals                                                             */
/* ------------------------------------------------------------------ */

/** Vertical type-safety pipeline with an animated traveling dot. */
function TypeFlow() {
  const steps: [string, string][] = [
    ["services/db/schema.ts", "Drizzle infers row & insert types"],
    ["services/trpc/routers/*", "procedures select against typed tables"],
    ["routers/_app.ts", "exports AppRouter · RouterInputs · RouterOutputs"],
    ["React component", "useQuery / useMutation autocomplete inputs + outputs"],
  ];
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        padding: "26px 24px",
        boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map(([label, sub], i) => (
          <div key={label}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: i === 0 || i === steps.length - 1 ? W : "#3F3F46",
                  flex: "none",
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 13, color: W }}>
                  {label}
                </div>
                <div
                  style={{ fontSize: 12.5, color: "#71717A", lineHeight: 1.5 }}
                >
                  {sub}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ position: "relative", height: 30, marginLeft: 4 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "#27272A",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: -2.5,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: GREEN,
                    boxShadow: `0 0 8px ${GREEN}`,
                    animation: `kfFlowY 2.6s ${i * 0.2}s ease-in-out infinite`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: "1px solid #18181B",
          fontSize: 12.5,
          color: "#71717A",
          lineHeight: 1.6,
        }}
      >
        Rename a column → the build breaks everywhere it's used, UI included.{" "}
        <span style={{ color: S }}>That's the point.</span>
      </div>
    </div>
  );
}

/** Email: design React Email templates in the preview server, then send them. */
function EmailWorkflow() {
  const templates = [
    "verify-email",
    "reset-password",
    "setup-account",
    "contact-form",
  ];
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
      }}
    >
      {/* browser chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid #27272A",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#27272A",
              display: "inline-block",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 10,
            fontFamily: MONO,
            fontSize: 12,
            color: "#8B8B94",
          }}
        >
          localhost:3000 — react email
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.08em",
            color: "#0A0A0A",
            background: GREEN,
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          pnpm email:dev
        </span>
      </div>

      {/* preview body: template list + live preview */}
      <div style={{ display: "flex", minHeight: 220 }}>
        <div
          style={{
            flex: "none",
            width: 150,
            borderRight: "1px solid #18181B",
            padding: "14px 0",
          }}
        >
          {templates.map((t, i) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                fontFamily: MONO,
                fontSize: 11.5,
                color: i === 0 ? W : "#8B8B94",
                background: i === 0 ? "#18181B" : "transparent",
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  background: i === 0 ? W : "#3F3F46",
                  flex: "none",
                }}
              />
              {t}
            </div>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          {/* rendered email mock */}
          <div
            style={{
              width: "100%",
              maxWidth: 240,
              background: "#FFFFFF",
              borderRadius: 6,
              padding: "22px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                background: "#0A0A0A",
                borderRadius: 6,
                flex: "none",
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A" }}>
              Verify your email
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {["4", "8", "2", "9", "1", "3"].map((d, i) => (
                <span
                  key={i}
                  style={{
                    width: 22,
                    height: 28,
                    border: "1px solid #E4E4E7",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: MONO,
                    fontSize: 13,
                    color: "#0A0A0A",
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            <span
              style={{
                width: "100%",
                textAlign: "center",
                background: "#0A0A0A",
                color: "#FAFAFA",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 5,
                padding: "9px 0",
              }}
            >
              Verify
            </span>
          </div>
        </div>
      </div>

      {/* send line */}
      <div
        style={{
          borderTop: "1px solid #27272A",
          padding: "16px 18px",
          fontFamily: MONO,
          fontSize: 12.5,
          lineHeight: 1.7,
          color: CODE,
          overflowX: "auto",
        }}
      >
        <span style={{ color: G }}>
          {"// design it above, then send the same component"}
        </span>
        {"\n"}
        <span style={{ color: W }}>await</span> email.send({"{"} to, subject,
        react: &lt;<span style={{ color: W }}>VerifyEmail</span> code={"{otp}"}{" "}
        /&gt; {"}"});
      </div>
    </div>
  );
}

/**
 * Two-layer panel: "what you write" (a hook) on top, "under the hood" (the
 * primitives the hook owns) dimmed below, plus the hook's returned API as chips.
 * Used to correct the misread that you wire the low-level flow yourself.
 */
function LayeredPanel({
  topLabel,
  topCode,
  divider,
  bottomLabel,
  bottomCode,
  api,
}: {
  topLabel: string;
  topCode: ReactNode;
  divider: string;
  bottomLabel: string;
  bottomCode: ReactNode;
  api: string[];
}) {
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #27272A",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, color: "#71717A" }}>
          {topLabel}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.1em",
            color: "#0A0A0A",
            background: GREEN,
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          WHAT YOU WRITE
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "20px 22px",
          fontFamily: MONO,
          fontSize: 13,
          lineHeight: 1.65,
          color: CODE,
          overflowX: "auto",
        }}
      >
        {topCode}
      </pre>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 22px",
          borderTop: "1px solid #18181B",
          borderBottom: "1px solid #18181B",
          background: "#0c0c0d",
        }}
      >
        <span style={{ flex: 1, height: 1, background: "#27272A" }} />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11.5,
            color: "#52525B",
            whiteSpace: "nowrap",
          }}
        >
          {divider}
        </span>
        <span style={{ flex: 1, height: 1, background: "#27272A" }} />
      </div>

      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #18181B",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 12, color: "#52525B" }}>
          {bottomLabel}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.1em",
            color: "#71717A",
            border: "1px solid #27272A",
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          UNDER THE HOOD
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "20px 22px 22px",
          fontFamily: MONO,
          fontSize: 12.5,
          lineHeight: 1.65,
          color: "#A1A1AA",
          overflowX: "auto",
        }}
      >
        {bottomCode}
      </pre>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "14px 20px 18px",
          borderTop: "1px solid #18181B",
        }}
      >
        {api.map((m) => (
          <span
            key={m}
            style={{
              fontFamily: MONO,
              fontSize: 11.5,
              color: "#A1A1AA",
              background: "#111113",
              border: "1px solid #27272A",
              borderRadius: 5,
              padding: "6px 10px",
            }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Fully-built admin dashboard preview. */
function AdminPreview() {
  const stats: [string, string][] = [
    ["Users", "1,248"],
    ["Products", "6"],
    ["Media", "312"],
    ["Logs", "8.4k"],
  ];
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 18px",
          borderBottom: "1px solid #27272A",
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            background: W,
            display: "inline-block",
          }}
        />
        <span style={{ fontFamily: MONO, fontSize: 12, color: "#71717A" }}>
          /admin
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 11,
            color: "#71717A",
            border: "1px solid #27272A",
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          adminProcedure
        </span>
      </div>
      <div style={{ padding: "20px 22px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {stats.map(([label, val]) => (
            <div
              key={label}
              style={{
                background: "#111113",
                border: "1px solid #27272A",
                borderRadius: 6,
                padding: "14px 16px",
              }}
            >
              <div
                style={{ fontSize: 11.5, color: "#71717A", marginBottom: 6 }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: W,
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "Overview",
            "Users · DataTable + detail",
            "Products · Polar catalog",
            "Media · R2 browser",
            "Activity logs",
          ].map((row, i) => (
            <div
              key={row}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12.5,
                color: i === 0 ? W : "#A1A1AA",
                fontFamily: MONO,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  background: i === 0 ? W : "#3F3F46",
                  flex: "none",
                }}
              />
              {row}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Pre-commit pipeline — self-validating gate, ends in deploy. */
function ShipPipeline() {
  const steps: [string, string][] = [
    ["pnpm format", "Prettier + import sort"],
    ["pnpm typecheck", "tsc --noEmit"],
    ["check-env", "every var registered"],
    ["vitest run", "invariants enforced"],
  ];
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #27272A",
          fontFamily: MONO,
          fontSize: 12,
          color: "#71717A",
        }}
      >
        .husky/pre-commit
      </div>
      <div
        style={{
          padding: "20px 22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {steps.map(([cmd, sub]) => (
          <div
            key={cmd}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <span
              style={{
                color: GREEN,
                fontFamily: MONO,
                fontSize: 14,
                flex: "none",
              }}
            >
              ✓
            </span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: W }}>
              {cmd}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "#71717A",
                marginLeft: "auto",
                textAlign: "right",
              }}
            >
              {sub}
            </span>
          </div>
        ))}
        <div style={{ height: 1, background: "#18181B", margin: "4px 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{ color: G, fontFamily: MONO, fontSize: 14, flex: "none" }}
          >
            ➜
          </span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: W }}>
            git push → Vercel
          </span>
          <span style={{ fontSize: 12, color: "#71717A", marginLeft: "auto" }}>
            live in ~40s
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function FsHero() {
  const [copied, copy] = useCopy();
  const services = [
    ["Better Auth", "auth"],
    ["Polar", "payments"],
    ["Drizzle · Neon", "database"],
    ["AWS SES", "email"],
    ["Cloudflare R2", "storage"],
    ["tRPC", "api"],
  ];
  return (
    <header
      style={{
        position: "relative",
        padding: "clamp(120px, 16vh, 168px) 0 0",
        background: "#0A0A0A",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, #18181B 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          ...container(),
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(40px, 5vw, 72px)",
          paddingBottom: "clamp(64px, 8vw, 96px)",
        }}
      >
        <div data-reveal style={{ flex: 1.1, minWidth: "min(100%, 420px)" }}>
          <div style={{ ...eyebrow("#71717A"), marginBottom: 22 }}>
            FULL-STACK TEMPLATE · ONE NEXT.JS APP
          </div>
          <h1
            style={{
              margin: "0 0 24px",
              fontSize: "clamp(40px, 5.2vw, 68px)",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              textWrap: "balance",
            }}
          >
            The backend is done.
            <span style={{ color: "#52525B" }}>
              {" "}
              Go build the part that's yours.
            </span>
          </h1>
          <p
            style={{
              margin: "0 0 34px",
              maxWidth: 540,
              color: "#A1A1AA",
              fontSize: "clamp(16px, 1.4vw, 18px)",
              lineHeight: 1.6,
              textWrap: "pretty",
            }}
          >
            A single, batteries-included Next.js 16 app. Auth, payments, email,
            storage, an admin panel and a type-safe API are wired together and
            production-tested. The marketing UI is a blank slate — so day one is
            design, not plumbing.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 26,
            }}
          >
            <a
              href="/#pricing"
              className="btn-white"
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#FAFAFA",
                color: "#0A0A0A",
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 500,
                padding: "13px 24px",
                borderRadius: 6,
                minHeight: 44,
                transition: "background 0.2s, transform 0.2s",
              }}
            >
              Get the template
            </a>
            <a
              href="#journey"
              className="btn-ghost-dark"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                color: "#FAFAFA",
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 500,
                padding: "13px 24px",
                border: "1px solid #27272A",
                borderRadius: 6,
                minHeight: 44,
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              Take the tour <span style={{ color: "#71717A" }}>↓</span>
            </a>
          </div>
          <CommandChip onCopy={copy} copied={copied} />
        </div>

        {/* Wiring card */}
        <div
          data-reveal
          style={{
            flex: 1,
            minWidth: "min(100%, 360px)",
            transitionDelay: "0.12s",
          }}
        >
          <div
            style={{
              background: "#111113",
              border: "1px solid #27272A",
              borderRadius: 8,
              padding: "24px 22px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <span
                style={{ fontFamily: MONO, fontSize: 12, color: "#71717A" }}
              >
                everything wired
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "#0A0A0A",
                  background: GREEN,
                  borderRadius: 4,
                  padding: "3px 8px",
                }}
              >
                READY
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              {services.map(([name, role], i) => (
                <div
                  key={name}
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #27272A",
                    borderRadius: 6,
                    padding: "14px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: GREEN,
                        animation: `kfPulse 2.4s ${i * 0.25}s ease-in-out infinite`,
                        flex: "none",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10.5,
                        letterSpacing: "0.1em",
                        color: "#71717A",
                      }}
                    >
                      {role.toUpperCase()}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: W,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: MONO,
                fontSize: 12,
                color: "#52525B",
                textAlign: "center",
              }}
            >
              ↓ all feeding one app ↓
            </div>
          </div>
        </div>
      </div>

      {/* trust strip */}
      <div style={{ position: "relative", borderTop: "1px solid #18181B" }}>
        <div
          data-reveal
          style={{
            ...container(),
            padding: "40px clamp(20px, 4vw, 32px) 56px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.14em",
              color: "#52525B",
              marginBottom: 24,
            }}
          >
            NO EXOTIC DEPENDENCIES — THE STACK YOU ALREADY KNOW
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              columnGap: "clamp(22px, 3.5vw, 40px)",
              rowGap: 14,
            }}
          >
            {TRUST.map((name) => (
              <span
                key={name}
                className="logo-item"
                style={{
                  fontSize: 15.5,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#71717A",
                  transition: "color 0.2s",
                  cursor: "default",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Journey intro                                                       */
/* ------------------------------------------------------------------ */

function JourneyIntro() {
  return (
    <section
      id="journey"
      style={{
        background: "#0A0A0A",
        color: "#FAFAFA",
        borderTop: "1px solid #27272A",
        padding: "clamp(80px, 10vw, 120px) 0 clamp(56px, 7vw, 88px)",
      }}
    >
      <div
        data-reveal
        style={{ ...container(), maxWidth: 760, textAlign: "center" }}
      >
        <div style={{ ...eyebrow("#71717A"), marginBottom: 18 }}>
          THE TOUR — CLONE TO LIVE
        </div>
        <h2 style={{ ...h2Style, marginInline: "auto" }}>
          Eight stops from <span style={{ color: "#52525B" }}>npx</span> to in
          production.
        </h2>
        <p
          style={{
            margin: "0 auto",
            maxWidth: 560,
            color: "#A1A1AA",
            fontSize: 17,
            lineHeight: 1.65,
            textWrap: "pretty",
          }}
        >
          Follow the path a builder actually takes. Each stop is a system that's
          already built, tested, and waiting — so the only thing left to write
          is your product.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Architecture (full-stack tree)                                      */
/* ------------------------------------------------------------------ */

function FsArchitecture() {
  return (
    <section
      style={{
        background: "#0A0A0A",
        color: "#FAFAFA",
        borderTop: "1px solid #18181B",
        padding: "clamp(80px, 10vw, 128px) 0",
      }}
    >
      <div style={container()}>
        <div
          data-reveal
          style={{ maxWidth: 680, marginBottom: "clamp(36px, 4vw, 56px)" }}
        >
          <div style={{ ...eyebrow("#71717A"), marginBottom: 18 }}>
            TYPED API
          </div>
          <h2 style={h2Style}>Call the backend like a local function.</h2>
          <p
            style={{
              margin: 0,
              color: "#A1A1AA",
              fontSize: 17,
              lineHeight: 1.6,
            }}
          >
            No REST boilerplate, no fetch wrappers. Pick a procedure tier and
            get its guarantee for free — every input and output typed end to end
            across ten routers.
          </p>
        </div>
        <div
          data-reveal
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              flex: 1.3,
              minWidth: "min(100%, 360px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CodePanel label="services/trpc/init.ts — typed procedure tiers">
              <span style={{ color: G }}>
                {"// pick a tier, get the guarantee for free"}
              </span>
              {"\n"}
              <span style={{ color: W }}>export const</span> baseProcedure
              {"          "}
              <span style={{ color: G }}>{"// public"}</span>
              {"\n"}
              <span style={{ color: W }}>export const</span>{" "}
              authenticatedProcedure {"  "}
              <span style={{ color: G }}>{"// throws UNAUTHORIZED"}</span>
              {"\n"}
              <span style={{ color: W }}>export const</span> adminProcedure
              {"         "}
              <span style={{ color: G }}>{"// throws FORBIDDEN"}</span>
              {"\n\n"}
              <span style={{ color: G }}>
                {"// rate-limit any resolver — one line, no infra"}
              </span>
              {"\n"}
              <span style={{ color: W }}>await</span> rateLimit(
              <span style={{ color: S }}>5</span>,{" "}
              <span style={{ color: S }}>"5m"</span>);
            </CodePanel>
            <div
              style={{
                marginTop: 16,
                flex: 1,
                background: "#0A0A0A",
                border: "1px solid #27272A",
                borderRadius: 8,
                padding: "18px 20px",
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignContent: "flex-start",
              }}
            >
              {[
                "users",
                "products",
                "payments",
                "files",
                "contact",
                "discounts",
                "logs",
                "verification",
                "admin",
                "auth",
              ].map((r) => (
                <span
                  key={r}
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: "#A1A1AA",
                    background: "#111113",
                    border: "1px solid #27272A",
                    borderRadius: 5,
                    padding: "7px 11px",
                  }}
                >
                  {r}
                </span>
              ))}
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  color: "#52525B",
                  alignSelf: "center",
                }}
              >
                10 routers, fully typed
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Done vs yours                                                       */
/* ------------------------------------------------------------------ */

function DoneVsYours() {
  const done = [
    "Auth, sessions & roles",
    "Polar checkout + webhooks",
    "Admin panel (do not strip)",
    "Settings, billing & danger zone",
    "Email service + 4 templates",
    "R2 uploads & media browser",
    "tRPC API + rate limiting",
    "Tests, env & commit gating",
  ];
  const yours = [
    "Landing page & sections",
    "Navbar, footer & blog",
    "Auth form styling",
    "Brand tokens (oklch)",
    "Logo, OG image, favicon",
    "Legal copy",
    "Your own features",
    "The actual product",
  ];
  const col = (
    title: string,
    items: string[],
    mark: string,
    markColor: string,
    light: boolean
  ) => (
    <div
      className={light ? "fs-card-light" : "fs-card"}
      style={{
        flex: 1,
        minWidth: "min(100%, 300px)",
        background: light ? "#FFFFFF" : "#0A0A0A",
        border: `1px solid ${light ? "#E4E4E7" : "#27272A"}`,
        borderRadius: 8,
        padding: "clamp(24px, 3vw, 34px)",
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          letterSpacing: "0.14em",
          color: light ? "#71717A" : "#71717A",
          marginBottom: 20,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {items.map((it) => (
          <div
            key={it}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "baseline",
              fontSize: 15,
              color: light ? "#52525B" : "#A1A1AA",
              lineHeight: 1.5,
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
            {it}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section
      style={{
        background: "#FFFFFF",
        color: "#0A0A0A",
        borderTop: "1px solid #E4E4E7",
        padding: "clamp(80px, 10vw, 128px) 0",
      }}
    >
      <div style={container()}>
        <div
          data-reveal
          style={{ maxWidth: 640, marginBottom: "clamp(40px, 5vw, 56px)" }}
        >
          <div style={{ ...eyebrow("#71717A"), marginBottom: 18 }}>
            HEADLESS BY DESIGN
          </div>
          <h2 style={h2Style}>What's built, and what's left for you.</h2>
          <p
            style={{
              margin: 0,
              color: "#71717A",
              fontSize: 17,
              lineHeight: 1.6,
              textWrap: "pretty",
            }}
          >
            The plumbing is finished and locked. The design surface is a blank
            slate. You spend your time where it differentiates — never re-wiring
            auth again.
          </p>
        </div>
        <div data-reveal style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {col("ALREADY BUILT", done, "✓", "#16A34A", true)}
          {col("YOUR CANVAS", yours, "→", "#0A0A0A", true)}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* pnpm sm scripts                                                     */
/* ------------------------------------------------------------------ */

const SM_SCRIPTS: [string, string][] = [
  ["check-env", "Validate required env vars by feature flag"],
  ["check-webhooks", "Sync Polar webhook endpoints"],
  ["check-email", "AWS SES email health check"],
  ["sync-plans", "Generate config/plans.ts from Polar"],
  ["seed-products", "Create test products in Polar"],
  ["list-routes", "Show all tRPC routes"],
  ["list-crons", "Show cron jobs from vercel.json"],
];

const CYAN = "#67E8F9";

type OutLine = { badge?: string; check?: string; val?: string; dim?: string };

const ENV_OUT: OutLine[] = [
  { badge: "✓ ENV", val: "All 14 required variables are set." },
  {
    check: "auth",
    val: "BETTER_AUTH_SECRET · DATABASE_URL · NEXT_PUBLIC_API_URL",
  },
  {
    check: "payments",
    val: "POLAR_ACCESS_TOKEN · POLAR_WEBHOOK_SECRET · POLAR_SERVER",
  },
  { check: "storage", val: "R2_ENDPOINT · R2_BUCKET_NAME · R2_PUBLIC_URL" },
  { check: "email", val: "AWS_BUCKET_ORIGIN · AWS_ACCESS_KEY_VALUE" },
];

const HOOK_OUT: OutLine[] = [
  { badge: "✓ POLAR", val: "Endpoint connected · 8 events in sync" },
  { check: "order.created" },
  { check: "order.refunded" },
  { check: "subscription.created" },
  { check: "subscription.updated" },
  { dim: "matches handlers in services/auth/auth.ts" },
];

function OutputLine({ line }: { line: OutLine }) {
  if (line.badge) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "2px 0 8px",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11.5,
            fontWeight: 700,
            color: "#0A0A0A",
            background: GREEN,
            borderRadius: 3,
            padding: "3px 8px",
          }}
        >
          {line.badge}
        </span>
        <span style={{ fontSize: 12.5, color: CODE }}>{line.val}</span>
      </div>
    );
  }
  if (line.dim) {
    return (
      <div
        style={{
          fontFamily: MONO,
          fontSize: 12,
          color: G,
          padding: "3px 0 0 2px",
        }}
      >
        {line.dim}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "3px 0",
      }}
    >
      <span
        style={{ color: GREEN, fontFamily: MONO, fontSize: 12.5, flex: "none" }}
      >
        ✓
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 12.5,
          color: "#D4D4D8",
          flex: "none",
          minWidth: line.val ? 78 : 0,
        }}
      >
        {line.check}
      </span>
      {line.val && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: 11.5,
            color: G,
            lineHeight: 1.5,
          }}
        >
          {line.val}
        </span>
      )}
    </div>
  );
}

/** Self-driving `pnpm sm` terminal: select → run → output → next. */
function SmTerminal() {
  const [view, setView] = useState<"menu" | "run">("menu");
  const [selected, setSelected] = useState(0);
  const [running, setRunning] = useState<string>("check-env");
  const [lines, setLines] = useState<OutLine[]>([]);
  const [showMode, setShowMode] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setView("menu");
      setSelected(0);
      return;
    }
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((r) => timers.push(setTimeout(r, ms)));

    const runScript = async (
      idx: number,
      name: string,
      out: OutLine[],
      mode: boolean
    ) => {
      setSelected(idx);
      await sleep(900);
      setView("run");
      setRunning(name);
      setLines([]);
      setShowMode(mode);
      await sleep(mode ? 850 : 550);
      for (const ln of out) {
        if (!alive) return;
        setLines((p) => [...p, ln]);
        await sleep(320);
      }
      await sleep(1700);
      setView("menu");
      setShowMode(false);
      await sleep(650);
    };

    const play = async () => {
      while (alive) {
        setView("menu");
        setSelected(0);
        setLines([]);
        await sleep(1200);
        await runScript(0, "check-env", ENV_OUT, false);
        if (!alive) return;
        await runScript(1, "check-webhooks", HOOK_OUT, true);
      }
    };
    play();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "13px 16px",
          borderBottom: "1px solid #27272A",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#27272A",
              display: "inline-block",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 10,
            fontFamily: MONO,
            fontSize: 12,
            color: "#8B8B94",
          }}
        >
          ~/saaskit — pnpm sm
        </span>
        {view === "run" && (
          <span
            style={{
              marginLeft: "auto",
              fontFamily: MONO,
              fontSize: 11,
              color: GREEN,
            }}
          >
            ● running
          </span>
        )}
      </div>

      <div style={{ padding: "16px 18px", minHeight: 286 }}>
        {view === "menu" ? (
          <>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 12.5,
                fontWeight: 700,
                color: W,
                marginBottom: 12,
              }}
            >
              Scripts
            </div>
            {SM_SCRIPTS.map(([name, desc], i) => {
              const on = i === selected;
              return (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    padding: "6px 8px",
                    borderRadius: 5,
                    background: on ? "#18181B" : "transparent",
                    transition: "background 0.18s",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      color: CYAN,
                      fontFamily: MONO,
                      fontSize: 13,
                      flex: "none",
                    }}
                  >
                    {on ? "❯" : ""}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 12.5,
                      color: on ? W : "#71717A",
                      fontWeight: on ? 700 : 400,
                      flex: "none",
                      width: 122,
                    }}
                  >
                    {name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: on ? "#A1A1AA" : "#52525B",
                      lineHeight: 1.5,
                    }}
                  >
                    {desc}
                  </span>
                </div>
              );
            })}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11.5,
                color: "#52525B",
                marginTop: 14,
                paddingLeft: 8,
              }}
            >
              ↑/↓ move · Enter run · q quit
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 700,
                color: W,
                marginBottom: 12,
              }}
            >
              ▶ {running}
              {showMode && (
                <span style={{ fontWeight: 400, color: G }}>
                  {"  "}Mode: (r)eport / (f)ix{" "}
                  <span style={{ color: W }}>r</span>
                </span>
              )}
            </div>
            {lines.map((ln, i) => (
              <OutputLine key={i} line={ln} />
            ))}
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 14,
                background: "#FAFAFA",
                verticalAlign: -2,
                marginTop: 4,
                animation: "blink 1.1s step-end infinite",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function DevScripts() {
  return (
    <section
      style={{
        background: "#0A0A0A",
        color: "#FAFAFA",
        borderTop: "1px solid #27272A",
        padding: "clamp(80px, 10vw, 128px) 0",
      }}
    >
      <div
        style={container({
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(40px, 6vw, 80px)",
          alignItems: "flex-start",
        })}
      >
        <div data-reveal style={{ flex: 1, minWidth: "min(100%, 320px)" }}>
          <div style={{ ...eyebrow("#71717A"), marginBottom: 18 }}>
            OPERATIONS
          </div>
          <h2 style={h2Style}>A toolbox that runs the boring parts.</h2>
          <p
            style={{
              margin: "0 0 18px",
              maxWidth: 420,
              color: "#A1A1AA",
              fontSize: 17,
              lineHeight: 1.6,
              textWrap: "pretty",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 15, color: S }}>
              pnpm sm
            </span>{" "}
            opens an arrow-key menu of colorized terminal tools. Pick one, it
            runs, reports, and drops you back to the menu — like the live demo
            on the right.
          </p>
          <p
            style={{
              margin: 0,
              maxWidth: 420,
              color: "#71717A",
              fontSize: 15,
              lineHeight: 1.6,
              textWrap: "pretty",
            }}
          >
            The critical ones (env, webhooks, plans) auto-run before every dev
            and build, so the project can't drift into a broken state.
          </p>
        </div>
        <div data-reveal style={{ flex: 1.25, minWidth: "min(100%, 360px)" }}>
          <SmTerminal />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Module optionality                                                  */
/* ------------------------------------------------------------------ */

function Modules() {
  const mods: [string, string][] = [
    ["Landing page", "always"],
    ["Auth", "core"],
    ["Payments", "optional"],
    ["Admin panel", "optional"],
    ["Blog / posts", "optional"],
    ["Storage (R2)", "optional"],
    ["Email (SES)", "optional"],
    ["Cron jobs", "optional"],
  ];
  const badge = (kind: string): CSSProperties => {
    const map: Record<string, [string, string]> = {
      always: ["#0A0A0A", "#FAFAFA"],
      core: ["#0A0A0A", "#FAFAFA"],
      optional: ["#71717A", "transparent"],
    };
    const [color, bg] = map[kind];
    return {
      fontFamily: MONO,
      fontSize: 10.5,
      letterSpacing: "0.1em",
      color,
      background: bg,
      border: bg === "transparent" ? "1px solid #D4D4D8" : "none",
      borderRadius: 4,
      padding: "4px 9px",
    };
  };
  return (
    <section
      style={{
        background: "#FFFFFF",
        color: "#0A0A0A",
        borderTop: "1px solid #E4E4E7",
        padding: "clamp(80px, 10vw, 128px) 0",
      }}
    >
      <div style={container()}>
        <div
          data-reveal
          style={{ maxWidth: 640, marginBottom: "clamp(40px, 5vw, 56px)" }}
        >
          <div style={{ ...eyebrow("#71717A"), marginBottom: 18 }}>
            TRIM TO FIT
          </div>
          <h2 style={h2Style}>Take what you need. Delete the rest.</h2>
          <p
            style={{
              margin: 0,
              color: "#71717A",
              fontSize: 17,
              lineHeight: 1.6,
              textWrap: "pretty",
            }}
          >
            Every module is removable — drop its files, its router import, its
            env vars and its deps. No client carries weight it doesn't use.
          </p>
        </div>
        <div
          data-reveal
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 14,
          }}
        >
          {mods.map(([name, kind]) => (
            <div
              key={name}
              className="fs-card-light"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: "#FFFFFF",
                border: "1px solid #E4E4E7",
                borderRadius: 8,
                padding: "18px 20px",
                transition: "border-color 0.2s",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {name}
              </span>
              <span style={badge(kind)}>{kind.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA (dark, matches landing FinalCta tone)                     */
/* ------------------------------------------------------------------ */

function FsFinalCta() {
  const [copied, copy] = useCopy();
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
          gap: 26,
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
          The tour ends where your product begins.
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
          One app, everything wired, deployable in an afternoon. Get the
          full-stack template and skip straight to the part that's yours.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <a
            href="/#pricing"
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
          <Link
            to="/docs"
            className="btn-ghost-dark"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              color: "#FAFAFA",
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 500,
              padding: "15px 30px",
              border: "1px solid #27272A",
              borderRadius: 6,
              minHeight: 44,
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            Read the docs <span style={{ color: "#71717A" }}>↗</span>
          </Link>
        </div>
        <CommandChip onCopy={copy} copied={copied} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Journey steps — shared by desktop scrolly + mobile stack            */
/* ------------------------------------------------------------------ */

type StepGroup =
  | "boot"
  | "types"
  | "auth"
  | "payments"
  | "email"
  | "storage"
  | "admin"
  | "ship";

type Step = {
  num: string;
  tag: string;
  title: string;
  body: string;
  group: StepGroup;
  light?: boolean;
  reverse?: boolean;
  visual: ReactNode;
};

const STEPS: Step[] = [
  {
    num: "01",
    group: "boot",
    tag: "STOP 01 · CLONE & BOOT",
    title: "Live in three commands.",
    body: "Scaffold with one npx command, drop your keys in .env, push. Env validation runs before dev and build, so a missing variable is caught on your machine — never in production.",
    visual: (
      <CodePanel label="~/dev — zsh">
        <span style={{ color: G }}>$</span>{" "}
        <span style={{ color: W }}>npx create-saaskit@latest</span>
        {"\n\n"}
        <span style={{ color: GREEN }}>✓</span> Cloning template
        <span style={{ color: G }}> ············ </span>done{"\n"}
        <span style={{ color: GREEN }}>✓</span> Installing dependencies
        <span style={{ color: G }}> ··· </span>done{"\n"}
        <span style={{ color: GREEN }}>✓</span> Validating env
        <span style={{ color: G }}> ·········· </span>done{"\n"}
        <span style={{ color: GREEN }}>✓</span> Wiring Better Auth + Polar
        <span style={{ color: G }}> </span>done{"\n\n"}
        <span style={{ color: G }}>➜</span>{" "}
        <span style={{ color: W }}>cd saaskit && pnpm dev</span>
        {"\n"}
        <span style={{ color: "#71717A" }}>
          {"  "}Ready on http://localhost:3000
        </span>{" "}
        <span style={{ color: G }}>— 1.2s</span>
      </CodePanel>
    ),
  },
  {
    num: "02",
    group: "types",
    light: true,
    reverse: true,
    tag: "STOP 02 · TYPE SAFETY",
    title: "One type, database to button.",
    body: "Types flow unbroken from the Drizzle schema through tRPC to your React components — no manual duplication. Even Polar's status enums are pulled into the schema, so the DB and the SDK can never drift.",
    visual: <TypeFlow />,
  },
  {
    num: "03",
    group: "auth",
    tag: "STOP 03 · AUTHENTICATION",
    title: "Read the user with one hook.",
    body: "In components you call useCurrentUser() — never getSession plumbing. Protected routes are already guarded by middleware (/admin, /settings, /checkout). Configure the plugins once; email + password, OTP, admin roles and mobile bearer tokens are on, and OAuth is one entry away.",
    visual: (
      <LayeredPanel
        topLabel="components/profile.tsx"
        topCode={
          <>
            <span style={{ color: W }}>const</span> {"{ data, isPending }"} ={" "}
            <span style={{ color: W }}>useCurrentUser</span>();{"\n\n"}
            <span style={{ color: W }}>if</span> (isPending){" "}
            <span style={{ color: W }}>return</span> &lt;Skeleton /&gt;;{"\n"}
            <span style={{ color: W }}>return</span> &lt;h1&gt;
            {"{data.user.name}"}&lt;/h1&gt;;{"\n\n"}
            <span style={{ color: G }}>
              {"// routes? middleware already redirects"}
            </span>
            {"\n"}
            <span style={{ color: G }}>
              {"//   guests away from /admin · /settings"}
            </span>
          </>
        }
        divider="Better Auth owns the session ↓"
        bottomLabel="services/auth/auth.ts"
        bottomCode={
          <>
            <span style={{ color: G }}>
              {"// configured once, then forgotten"}
            </span>
            {"\n"}
            betterAuth({"{ plugins: ["}
            {"\n"}
            {"  "}emailOTP(), admin(), bearer(),{"\n"}
            {"  "}polar({"{ ... }"}), nextCookies(),{"\n"}
            {"] })"}
          </>
        }
        api={[
          "useCurrentUser",
          "useUpdateUser",
          "useRevokeSession",
          "useChangeOwnPassword",
        ]}
      />
    ),
  },
  {
    num: "04",
    group: "payments",
    light: true,
    reverse: true,
    tag: "STOP 04 · PAYMENTS",
    title: "Checkout in a call, access in a check.",
    body: "useCheckout() opens Polar's hosted page; useAccess() tells you what the user owns with a typed hasPlan(). You never parse a webhook or read a subscription row — the plugin keeps the database true, and the hooks read it back, typed.",
    visual: (
      <LayeredPanel
        topLabel="components/upgrade-button.tsx"
        topCode={
          <>
            <span style={{ color: W }}>const</span> checkout ={" "}
            <span style={{ color: W }}>useCheckout</span>();{"\n"}
            <span style={{ color: W }}>const</span> {"{ hasPlan }"} ={" "}
            <span style={{ color: W }}>useAccess</span>();{"\n\n"}
            <span style={{ color: G }}>{"// start a purchase"}</span>
            {"\n"}
            checkout.mutate({"{ productId }"});{"\n\n"}
            <span style={{ color: G }}>
              {"// gate a feature, typed PlanKey"}
            </span>
            {"\n"}
            <span style={{ color: W }}>if</span> (hasPlan(
            <span style={{ color: S }}>"pro"</span>)) showProFeature();
          </>
        }
        divider="Polar + webhooks keep it true ↓"
        bottomLabel="services/auth/auth.ts — Polar plugin"
        bottomCode={
          <>
            <span style={{ color: G }}>
              {"// checkout → hosted page, redirect handled"}
            </span>
            {"\n"}
            <span style={{ color: G }}>
              {"// webhook order.created / subscription.*"}
            </span>
            {"\n"}
            <span style={{ color: G }}>
              {"//   → writes order + subscription to DB"}
            </span>
            {"\n"}
            onSubscriptionUpdated: ({"{ data }"}) =&gt; updateSubscription(data)
          </>
        }
        api={[
          "useCheckout",
          "useAccess",
          "useGeneratePortalLink",
          "useGetCustomerState",
          "useSwitchPlan",
        ]}
      />
    ),
  },
  {
    num: "05",
    group: "email",
    tag: "STOP 05 · EMAIL",
    title: "Design emails like components.",
    body: "Every template is a React Email component. Run pnpm email:dev to open a live preview server, tweak the design in the browser, then send the exact same component with email.send({ react: <VerifyEmail /> }). Verify, reset, setup and contact ship ready — and the provider swaps from one file, so every caller keeps working.",
    visual: <EmailWorkflow />,
  },
  {
    num: "06",
    group: "storage",
    light: true,
    reverse: true,
    tag: "STOP 06 · STORAGE",
    title: "One hook for every upload.",
    body: "You never touch presigned URLs. useUpload() gives you upload, replace and remove — plus live progress and toasts. It requests the signed URL, PUTs straight to R2 with raw axios, and reports back. One import owns the whole file lifecycle; the admin media browser and path-traversal guards come free.",
    visual: (
      <LayeredPanel
        topLabel="components/avatar-form.tsx"
        topCode={
          <>
            <span style={{ color: W }}>const</span>{" "}
            {"{ upload, progress, isUploading }"} ={" "}
            <span style={{ color: W }}>useUpload</span>();{"\n\n"}
            <span style={{ color: G }}>{"// drop a file → done"}</span>
            {"\n"}
            <span style={{ color: W }}>const</span> res ={" "}
            <span style={{ color: W }}>await</span> upload(file, {"{ folder: "}
            <span style={{ color: S }}>"avatars"</span>
            {" }"});{"\n"}
            <span style={{ color: W }}>if</span> (res) form.setValue(
            <span style={{ color: S }}>"image"</span>, res.publicUrl);
          </>
        }
        divider="the hook handles the rest ↓"
        bottomLabel="hooks/use-upload.ts"
        bottomCode={
          <>
            <span style={{ color: G }}>
              {"// 1 · presigned URL from your backend"}
            </span>
            {"\n"}
            getUploadUrl.mutateAsync({"{ key, folder, contentType }"}){"\n"}
            <span style={{ color: G }}>
              {"// 2 · raw axios PUT → R2 (no auth header,"}
            </span>
            {"\n"}
            <span style={{ color: G }}>
              {"//     so no CORS reject) + onUploadProgress"}
            </span>
            {"\n"}
            axios.put(signedUrl, file, {"{ onUploadProgress }"}){"\n"}
            <span style={{ color: G }}>
              {"// 3 · progress state · success + error toasts"}
            </span>
          </>
        }
        api={["upload", "replace", "remove", "progress", "isUploading"]}
      />
    ),
  },
  {
    num: "07",
    group: "admin",
    tag: "STOP 07 · ADMIN & SETTINGS",
    title: "A back office, fully built.",
    body: "Users with a full detail view, the Polar-synced product catalog, an R2 media browser, and an activity-log viewer — all on a shared DataTable, all guarded by adminProcedure. Settings, billing and account deletion ship working too. You design the marketing; these are done.",
    visual: <AdminPreview />,
  },
  {
    num: "08",
    group: "ship",
    light: true,
    reverse: true,
    tag: "STOP 08 · SHIP",
    title: "Self-validating, then live.",
    body: "A Husky pre-commit hook formats, type-checks, validates env, and runs Vitest invariants — a broken type or a cron/Vercel mismatch is blocked before it lands. Pass the gate, push, and Vercel takes it from there.",
    visual: <ShipPipeline />,
  },
];

/* ------------------------------------------------------------------ */
/* Desktop scrollytelling: sticky file-tree + scrolling story          */
/* ------------------------------------------------------------------ */

type TreeNode = {
  name: string;
  desc?: string;
  g?: StepGroup | StepGroup[];
  children?: TreeNode[];
};

const TREE: TreeNode[] = [
  {
    name: "app/",
    children: [
      {
        name: "(marketing)/",
        desc: "landing · blog · contact",
        children: [
          { name: "settings/", desc: "billing · profile", g: "admin" },
        ],
      },
      { name: "(auth)/", desc: "login · signup · reset", g: "auth" },
      { name: "admin/", desc: "users · products · media · logs", g: "admin" },
      { name: "api/", desc: "tRPC · auth · cron", g: "types" },
    ],
  },
  {
    name: "services/",
    children: [
      { name: "auth/", desc: "Better Auth · hooks", g: "auth" },
      { name: "db/schema.ts", desc: "Drizzle · Neon", g: "types" },
      { name: "payments/", desc: "Polar SDK", g: "payments" },
      { name: "email/", desc: "React Email templates", g: "email" },
      { name: "storage/", desc: "Cloudflare R2", g: "storage" },
      { name: "trpc/", desc: "10 typed routers", g: "types" },
    ],
  },
  {
    name: "hooks/use-upload.ts",
    desc: "upload · replace · remove",
    g: "storage",
  },
  { name: "config/plans.ts", desc: "typed PlanKey", g: "payments" },
  { name: "scripts/", desc: "pnpm sm", g: ["boot", "ship"] },
  { name: "__tests__/", desc: "invariants", g: "ship" },
  { name: ".husky/", desc: "pre-commit gate", g: "ship" },
  { name: ".env.example", g: "boot" },
  { name: "vercel.json", g: "ship" },
  { name: "package.json", g: "boot" },
];

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

const treeMatches = (
  g: StepGroup | StepGroup[] | undefined,
  active: StepGroup
) => g != null && (Array.isArray(g) ? g.includes(active) : g === active);

const treeSubtreeActive = (n: TreeNode, active: StepGroup): boolean =>
  treeMatches(n.g, active) ||
  (n.children?.some((c) => treeSubtreeActive(c, active)) ?? false);

// Module-level so identity is stable across re-renders — otherwise React remounts
// the subtree on every active change and the CSS transitions never run.
function TreeRow({
  node,
  depth,
  active,
}: {
  node: TreeNode;
  depth: number;
  active: StepGroup;
}) {
  const on = treeMatches(node.g, active);
  const lit = treeSubtreeActive(node, active);
  const opacity = on ? 1 : lit ? 0.95 : 0.6;
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          padding: "5px 0",
          paddingLeft: depth * 16,
          opacity,
          transform: on ? "scale(1.03)" : "scale(1)",
          transformOrigin: "left center",
          transition: `opacity 0.4s ${EASE}, transform 0.4s ${EASE}`,
        }}
      >
        <span
          style={{
            width: 3,
            height: 13,
            borderRadius: 2,
            background: on ? GREEN : "transparent",
            flex: "none",
            transition: `background 0.4s ${EASE}`,
          }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 12.5,
            color: on ? W : "#D4D4D8",
            fontWeight: on ? 600 : 400,
            flex: "none",
            transition: `color 0.4s ${EASE}`,
          }}
        >
          {node.name}
        </span>
        {node.desc && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: on ? "#A1A1AA" : "#71717A",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              transition: `color 0.4s ${EASE}`,
            }}
          >
            {node.desc}
          </span>
        )}
      </div>
      {node.children?.map((c, i) => (
        <TreeRow key={i} node={c} depth={depth + 1} active={active} />
      ))}
    </>
  );
}

function FileTree({ active }: { active: StepGroup }) {
  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #27272A",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 20px 48px rgba(0,0,0,0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "13px 16px",
          borderBottom: "1px solid #27272A",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#27272A",
              display: "inline-block",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 10,
            fontFamily: MONO,
            fontSize: 12,
            color: "#8B8B94",
          }}
        >
          saaskit/ — project root
        </span>
      </div>
      <div style={{ padding: "16px 16px 18px" }}>
        {TREE.map((n, i) => (
          <TreeRow key={i} node={n} depth={0} active={active} />
        ))}
      </div>
    </div>
  );
}

function StoryStep({ step, active }: { step: Step; active: boolean }) {
  return (
    <div
      style={{ opacity: active ? 1 : 0.45, transition: `opacity 0.4s ${EASE}` }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: "clamp(30px, 3vw, 42px)",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            color: active ? W : "#3F3F46",
            lineHeight: 1,
            transition: `color 0.4s ${EASE}`,
          }}
        >
          {step.num}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: "0.16em",
            color: "#71717A",
          }}
        >
          {step.tag}
        </span>
      </div>
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: "clamp(26px, 2.6vw, 34px)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.12,
          color: "#FAFAFA",
        }}
      >
        {step.title}
      </h3>
      <p
        style={{
          margin: 0,
          color: "#A1A1AA",
          fontSize: 16.5,
          lineHeight: 1.65,
          textWrap: "pretty",
          maxWidth: 540,
        }}
      >
        {step.body}
      </p>
      <div style={{ marginTop: 28, maxWidth: 560 }}>{step.visual}</div>
    </div>
  );
}

function JourneyScrolly() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setActive(idx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section
      style={{
        background: "#0A0A0A",
        color: "#FAFAFA",
        borderTop: "1px solid #27272A",
        padding: "clamp(56px, 7vw, 96px) 0 clamp(40px, 6vw, 80px)",
      }}
    >
      <div
        style={{
          ...container(),
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) 1fr",
          gap: "clamp(32px, 5vw, 72px)",
          alignItems: "start",
        }}
      >
        <div style={{ position: "sticky", top: 96, alignSelf: "start" }}>
          <FileTree active={STEPS[active].group} />
          <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
            {STEPS.map((s, i) => (
              <span
                key={s.num}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i === active ? GREEN : "#27272A",
                  transition: `background 0.4s ${EASE}`,
                }}
              />
            ))}
          </div>
        </div>

        <div>
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              data-idx={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              style={{
                minHeight: "82vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                paddingBlock: "clamp(24px, 6vh, 72px)",
              }}
            >
              <StoryStep step={s} active={i === active} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function FullStack() {
  useReveals();
  const { isMobile } = useViewport();

  return (
    <div
      style={{
        background: "#0A0A0A",
        color: "#FAFAFA",
        fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        overflowX: "clip",
      }}
    >
      <Navbar />
      <FsHero />
      <JourneyIntro />

      {isMobile ? (
        STEPS.map((s) => (
          <Stop
            key={s.num}
            num={s.num}
            tag={s.tag}
            title={s.title}
            body={s.body}
            visual={s.visual}
            light={s.light}
            reverse={s.reverse}
          />
        ))
      ) : (
        <JourneyScrolly />
      )}

      <FsArchitecture />
      <DoneVsYours />
      <DevScripts />
      <Modules />
      <FsFinalCta />
      <Footer />
    </div>
  );
}
