export function Footer() {
  return (
    <footer className="mx-auto max-w-7xl border-t border-border-subtle px-5 pb-8 pt-16 lg:px-8">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[2fr_1fr_1fr_2fr] md:gap-8">
        <div>
          <div className="mb-4 text-[15px] font-bold tracking-tight text-text">ALI<span className="text-primary">.SAMADII</span></div>
          <p className="mb-6 max-w-[260px] text-[13px] leading-relaxed text-muted">A creative agency focused on building exceptional digital experiences that drive real results.</p>
          <div className="flex gap-5">
            <a href="https://x.com/alisamadii_" target="_blank" rel="noopener" aria-label="Twitter" className="text-muted transition-colors duration-300 hover:text-text"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
            <a href="https://github.com/alisamadiii" target="_blank" rel="noopener" aria-label="GitHub" className="text-muted transition-colors duration-300 hover:text-text"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
            <a href="https://www.linkedin.com/in/alireza17/" target="_blank" rel="noopener" aria-label="LinkedIn" className="text-muted transition-colors duration-300 hover:text-text"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-[13px] font-semibold text-text">Navigation</h4>
          <ul className="flex flex-col gap-2.5">
            {[["Home", "#hero"], ["Services", "#services"], ["About", "#about"], ["Contact", "#contact"]].map(([l, h]) => (
              <li key={l}><a href={h} className="text-[13px] text-muted transition-colors duration-300 hover:text-text">{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[13px] font-semibold text-text">Services</h4>
          <ul className="flex flex-col gap-2.5">
            {["Web Development", "UI/UX Design", "Brand Identity", "SEO & Analytics"].map((s) => (
              <li key={s}><a href="#services" className="text-[13px] text-muted transition-colors duration-300 hover:text-text">{s}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-[13px] font-semibold text-text">Newsletter</h4>
          <p className="text-[13px] leading-relaxed text-muted">Get the latest updates, tips, and insights delivered to your inbox.</p>
        </div>
      </div>
      <div className="mt-12 border-t border-border-subtle pt-6 text-center font-mono text-[11px] text-muted/50">
        &copy; 2026 Ali Samadi Agency. All rights reserved.
      </div>
    </footer>
  );
}
