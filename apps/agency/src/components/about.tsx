import { motion } from "motion/react";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="max-w-2xl lg:pl-[clamp(1rem,5vw,6rem)]"
      >
        <div className="mb-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">02</span> &mdash; About Us
        </div>
        <h2 className="font-heading text-3xl font-bold leading-[1.12] tracking-tight text-text md:text-4xl lg:text-[2.75rem]">
          We craft digital products<br />that people <em className="text-primary">love</em> to use
        </h2>
        <p className="mt-7 max-w-[65ch] text-base leading-relaxed text-muted">
          Founded with a passion for pixel-perfect design and clean code, we've spent over a decade helping brands transform their digital presence. Our approach blends creativity with data-driven strategy to deliver experiences that matter.
        </p>
      </motion.div>
    </section>
  );
}
