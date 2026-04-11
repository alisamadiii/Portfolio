const WORDS = ["DESIGN", "DEVELOP", "DELIVER", "BRAND", "STRATEGY", "INNOVATE"];

export function Marquee() {
  const items = [...WORDS, ...WORDS];
  return (
    <section className="overflow-hidden border-y border-border-subtle py-5">
      <div className="marquee-track flex whitespace-nowrap">
        {items.map((w, i) => (
          <span key={i} className="flex-shrink-0">
            <span className="px-8 font-heading text-[clamp(2.5rem,5vw,4.5rem)] font-bold italic tracking-tight text-text/[0.04]">{w}</span>
            <span className="px-2 text-[clamp(2.5rem,5vw,4.5rem)] text-primary/20">/</span>
          </span>
        ))}
      </div>
    </section>
  );
}
