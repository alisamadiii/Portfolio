import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { MONO, noop } from "../lib/constants";
import { container } from "../lib/styles";

type FooterLink = {
  href: string;
  label: string;
  route?: boolean;
  external?: boolean;
};

const COLS: { title: string; links: FooterLink[] }[] = [
  {
    title: "PRODUCT",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#templates", label: "Templates" },
      { href: "/#pricing", label: "Pricing" },
      { href: "#", label: "Live demo" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { href: "/docs", label: "Docs", route: true },
      { href: "/changelog", label: "Changelog", route: true },
      { href: "https://github.com", label: "GitHub", external: true },
    ],
  },
  {
    title: "LEGAL",
    links: [
      { href: "/license", label: "License", route: true },
      { href: "/terms", label: "Terms", route: true },
    ],
  },
];

const footLink: CSSProperties = {
  color: "#A1A1AA",
  textDecoration: "none",
  fontSize: 14,
  transition: "color 0.2s",
};

const colTitle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "0.14em",
  color: "#52525B",
  marginBottom: 18,
};

function FootLink({ link }: { link: FooterLink }) {
  if (link.route) {
    return (
      <Link to={link.href} className="foot-lnk" style={footLink}>
        {link.label}
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      onClick={link.href === "#" ? noop : undefined}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noreferrer" : undefined}
      className="foot-lnk"
      style={footLink}
    >
      {link.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        background: "#0A0A0A",
        color: "#FAFAFA",
        borderTop: "1px solid #27272A",
        padding: "64px 0 40px",
      }}
    >
      <div style={container()}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(40px, 6vw, 96px)",
            marginBottom: 56,
          }}
        >
          <div style={{ flex: 1.4, minWidth: "min(100%, 260px)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: "#FAFAFA",
                  display: "inline-block",
                }}
              />
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600 }}>
                saaskit
              </span>
            </div>
            <p
              style={{
                margin: 0,
                color: "#71717A",
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 300,
              }}
            >
              Production-ready SaaS starter templates. Skip the boilerplate,
              ship the idea.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title} style={{ flex: 1, minWidth: 140 }}>
              <div style={colTitle}>{col.title}</div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 11 }}
              >
                {col.links.map((link) => (
                  <FootLink key={link.label} link={link} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid #18181B",
            paddingTop: 28,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              color: "#52525B",
              whiteSpace: "nowrap",
            }}
          >
            © 2026 SaaSKit
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="foot-lnk"
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: "#71717A",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "color 0.2s",
              }}
            >
              X ↗
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="foot-lnk"
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: "#71717A",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "color 0.2s",
              }}
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
