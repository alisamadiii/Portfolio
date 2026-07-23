import type { ReactNode } from "react";

import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

/** White content-page shell with the solid nav and shared footer. */
export function PageLayout({
  children,
  maxWidth = 820,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        color: "#0A0A0A",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar solid />
      <main style={{ flex: 1, paddingTop: 64 }}>
        <div
          style={{
            maxWidth,
            margin: "0 auto",
            padding:
              "clamp(56px, 8vw, 96px) clamp(20px, 4vw, 32px) clamp(64px, 9vw, 112px)",
          }}
        >
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
