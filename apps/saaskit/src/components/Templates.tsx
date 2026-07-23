import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { MONO } from "../lib/constants";
import { container, eyebrow, h2Style } from "../lib/styles";

export function Templates() {
  const bullet = (text: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "#A1A1AA",
        fontSize: 14.5,
      }}
    >
      <span
        style={{ width: 4, height: 4, background: "#71717A", flex: "none" }}
      />
      {text}
    </div>
  );
  const cardBase: CSSProperties = {
    background: "#0A0A0A",
    color: "#FAFAFA",
    borderRadius: 8,
    padding: "clamp(28px, 3vw, 40px)",
    display: "flex",
    flexDirection: "column",
    gap: 22,
    transition: "transform 0.25s, box-shadow 0.25s",
  };
  const preStyle: CSSProperties = {
    margin: 0,
    background: "#111113",
    border: "1px solid #27272A",
    borderRadius: 6,
    padding: "18px 20px",
    fontFamily: MONO,
    fontSize: 12.5,
    lineHeight: 1.75,
    color: "#A1A1AA",
    overflowX: "auto",
  };
  return (
    <section
      id="templates"
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
          style={{ maxWidth: 640, marginBottom: "clamp(40px, 5vw, 64px)" }}
        >
          <div style={{ ...eyebrow("#71717A"), marginBottom: 18 }}>
            TWO SKUS
          </div>
          <h2 style={h2Style}>Two templates. Pick your starting point.</h2>
          <p
            style={{
              margin: 0,
              color: "#71717A",
              fontSize: 17,
              lineHeight: 1.6,
              textWrap: "pretty",
            }}
          >
            Same stack, same integrations — different shape. One is the shortest
            path to live; the other is built for the day you're three apps deep.
          </p>
        </div>

        <div
          data-reveal
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: 20,
          }}
        >
          {/* Full-Stack */}
          <div className="tmpl-card" style={cardBase}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#0A0A0A",
                  background: "#FAFAFA",
                  padding: "5px 10px",
                  borderRadius: 4,
                }}
              >
                FASTEST TO SHIP
              </span>
            </div>
            <div>
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                Full-Stack Template
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#A1A1AA",
                  fontSize: 15.5,
                  lineHeight: 1.6,
                }}
              >
                A single batteries-included app. Everything in one place. The
                shortest path from idea to live SaaS.
              </p>
            </div>
            <pre style={preStyle}>
              {"saaskit/\n"}
              {"├─ app/         "}
              <span style={{ color: "#52525B" }}>routes · admin · api</span>
              {"\n"}
              {"├─ components/  "}
              <span style={{ color: "#52525B" }}>shadcn/ui</span>
              {"\n"}
              {"├─ services/    "}
              <span style={{ color: "#52525B" }}>
                auth · payments · db · email · storage
              </span>
              {"\n"}
              {"└─ content/     "}
              <span style={{ color: "#52525B" }}>blog · legal</span>
            </pre>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bullet("One app, zero config sprawl")}
              {bullet("Ideal for first products and solo builders")}
              {bullet("Deployable in an afternoon")}
            </div>
            <Link
              to="/full-stack"
              className="btn-solid-light"
              style={{
                marginTop: "auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#FAFAFA",
                color: "#0A0A0A",
                textDecoration: "none",
                fontSize: 14.5,
                fontWeight: 500,
                padding: "12px 20px",
                borderRadius: 6,
                minHeight: 44,
                transition: "background 0.2s",
              }}
            >
              Explore full-stack
            </Link>
          </div>

          {/* Monorepo */}
          <div className="tmpl-card" style={cardBase}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#FAFAFA",
                  border: "1px solid #3F3F46",
                  padding: "4px 10px",
                  borderRadius: 4,
                }}
              >
                BUILT TO SCALE
              </span>
            </div>
            <div>
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                Monorepo Template
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#A1A1AA",
                  fontSize: 15.5,
                  lineHeight: 1.6,
                }}
              >
                A Turborepo workspace with shared packages across web, mobile,
                and backend. One codebase, many apps.
              </p>
            </div>
            <pre style={preStyle}>
              {"saaskit/\n"}
              {"├─ apps/           "}
              <span style={{ color: "#52525B" }}>web · mobile · api</span>
              {"\n"}
              {"├─ packages/\n"}
              {"│  ├─ ui/          "}
              <span style={{ color: "#52525B" }}>shared components</span>
              {"\n"}
              {"│  └─ db/          "}
              <span style={{ color: "#52525B" }}>schema + client</span>
              {"\n"}
              {"└─ turbo.json"}
            </pre>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bullet("Shared UI, db & config packages")}
              {bullet("Web + mobile + API from one repo")}
              {bullet("Ideal for teams scaling multiple products")}
            </div>
            <a
              href="#pricing"
              className="btn-ghost-light"
              style={{
                marginTop: "auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                color: "#FAFAFA",
                border: "1px solid #3F3F46",
                textDecoration: "none",
                fontSize: 14.5,
                fontWeight: 500,
                padding: "12px 20px",
                borderRadius: 6,
                minHeight: 44,
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              Start monorepo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
