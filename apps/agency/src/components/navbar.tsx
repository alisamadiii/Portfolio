import { useEffect, useState } from "react";
import { useMagnetic } from "../hooks/use-magnetic";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const magneticRef = useMagnetic<HTMLAnchorElement>();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 right-0 left-0 z-40 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? "rgba(249,250,251,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.04)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <a href="#" className="text-[15px] font-bold tracking-tight text-text">
            ALI<span className="text-primary">.SAMADII</span>
          </a>
          <div className="hidden items-center gap-9 md:flex">
            <a href="#services" className="nav-link text-[13px] text-muted transition-colors duration-300 hover:text-text">Services</a>
            <a href="#about" className="nav-link text-[13px] text-muted transition-colors duration-300 hover:text-text">About</a>
            <a href="#pricing" className="nav-link text-[13px] text-muted transition-colors duration-300 hover:text-text">Pricing</a>
            <a href="#contact" className="nav-link text-[13px] text-muted transition-colors duration-300 hover:text-text">Contact</a>
            <a
              ref={magneticRef}
              href="https://cal.com/alisamadii"
              target="_blank"
              rel="noopener"
              className="magnetic-btn rounded-full border border-border bg-surface px-5 py-2 text-[13px] font-medium text-text transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground active:-translate-y-px active:scale-[0.97]"
            >
              Let's Talk
            </a>
          </div>
          <button className="block md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="7" x2="21" y2="7" /><line x1="8" y1="17" x2="21" y2="17" /></svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-10 bg-bg">
          <button className="absolute top-6 right-6 text-text" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          {["services", "about", "pricing", "contact"].map((s) => (
            <a key={s} href={`#${s}`} className="text-xl font-medium capitalize text-text" onClick={() => setMenuOpen(false)}>{s}</a>
          ))}
        </div>
      )}
    </>
  );
}
