import { Architecture } from "../components/Architecture";
import { DeepDive } from "../components/DeepDive";
import { Faq } from "../components/Faq";
import { Features } from "../components/Features";
import { FinalCta } from "../components/FinalCta";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { Navbar } from "../components/Navbar";
import { Pricing } from "../components/Pricing";
import { Quickstart } from "../components/Quickstart";
import { Templates } from "../components/Templates";
import { useReveals, useViewport } from "../lib/hooks";

export default function Landing() {
  const { isMobile, isMid } = useViewport();
  useReveals();

  const cols = isMobile
    ? "1fr"
    : isMid
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))";
  const span2 = isMobile ? "auto" : "span 2";

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
      <Hero />
      <Features span2={span2} cols={cols} />
      <Templates />
      <Architecture />
      <Quickstart />
      <DeepDive />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
