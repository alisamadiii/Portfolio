import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

const links = [
  // { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 right-0 left-0 z-50 h-16 transition-all duration-500",
        scrolled
          ? "bg-background/80 border-border border-b backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="border-border/50 mx-auto flex h-full w-full max-w-[1400px] items-center justify-between border-x">
        <div className="flex w-full items-center justify-between px-8">
          <a href="#" className="font-heading text-xl font-bold tracking-tight">
            ALI
            <span className="text-primary">.</span>
            SAMADII
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground group relative font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-300"
              >
                {link.label}
                <span className="bg-primary absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <a
              href="#contact"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground border px-5 py-2.5 font-mono text-xs tracking-[0.2em] uppercase transition-all duration-300"
            >
              Let&apos;s Talk
            </a>
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="border-border hover:border-primary/50 flex h-10 w-10 items-center justify-center border transition-colors md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-border bg-background/95 fixed top-16 right-0 left-0 border-t backdrop-blur-xl md:hidden"
          >
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground border-border block border-b px-8 py-4 font-mono text-sm tracking-[0.15em] uppercase transition-colors hover:bg-white/[0.02]"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>
        )}
      </div>
    </motion.header>
  );
}
