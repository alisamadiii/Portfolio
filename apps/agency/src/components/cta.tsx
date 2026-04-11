import { useReveal } from "../hooks/use-reveal";
import { useMagnetic } from "../hooks/use-magnetic";

export function CTA() {
  const ref = useReveal<HTMLDivElement>();
  const magneticRef = useMagnetic<HTMLAnchorElement>();

  return (
    <section className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-40">
      <div ref={ref} className="max-w-2xl lg:pl-[clamp(1rem,5vw,6rem)]">
        <h2 className="text-3xl font-extrabold leading-[0.95] tracking-[-0.035em] text-text md:text-[3rem] lg:text-[3.5rem]">
          Let's Create<br />Something Amazing
        </h2>
        <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-muted">
          Ready to elevate your digital presence? We'd love to hear about your project and explore how we can help.
        </p>
        <a
          ref={magneticRef}
          href="https://cal.com/alisamadii"
          target="_blank"
          rel="noopener"
          className="magnetic-btn mt-10 inline-flex rounded-full bg-primary px-8 py-3.5 text-[13px] font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,184,148,0.15)] active:-translate-y-px active:scale-[0.97]"
        >
          Start a Conversation
        </a>
      </div>
    </section>
  );
}
