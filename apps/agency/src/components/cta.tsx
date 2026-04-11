import { motion } from "motion/react";
import { useMagnetic } from "../hooks/use-magnetic";

export function CTA() {
  const magnetic = useMagnetic<HTMLAnchorElement>();

  return (
    <section className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-40">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="max-w-2xl lg:pl-[clamp(1rem,5vw,6rem)]"
      >
        <h2 className="font-heading text-3xl font-bold leading-[0.95] tracking-tight text-text md:text-[3rem] lg:text-[3.5rem]">
          Let's Create<br /><em>Something Amazing</em>
        </h2>
        <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-muted">
          Ready to elevate your digital presence? We'd love to hear about your project and explore how we can help.
        </p>
        <motion.a
          ref={magnetic.ref}
          style={magnetic.style}
          href="https://cal.com/alisamadii"
          target="_blank"
          rel="noopener"
          className="magnetic-btn mt-10 inline-flex rounded-full bg-primary px-8 py-3.5 text-[13px] font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgba(252,132,100,0.2)] active:-translate-y-px active:scale-[0.97]"
        >
          Start a Conversation
        </motion.a>
      </motion.div>
    </section>
  );
}
