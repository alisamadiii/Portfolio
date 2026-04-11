import { motion } from "motion/react";
import { useMagnetic } from "../hooks/use-magnetic";
import { useScramble } from "../hooks/use-scramble";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

export function Hero() {
  const magnetic = useMagnetic<HTMLAnchorElement>();
  const scrambleRef = useScramble("We Build\nDigital\nExperiences");

  return (
    <section id="hero" className="relative mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 px-5 lg:grid-cols-[1.4fr_1fr] lg:gap-16 lg:px-8">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col justify-center pt-32 pb-16 lg:pt-0 lg:pb-0 lg:pl-[clamp(1rem,5vw,6rem)]"
      >
        <motion.div variants={fadeUp} className="mb-10 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">01</span> &mdash; Creative Agency
        </motion.div>
        <motion.h1
          variants={fadeUp}
          ref={scrambleRef}
          className="whitespace-pre-line font-heading text-4xl font-bold leading-[0.95] tracking-tight text-text md:text-[3.5rem] lg:text-[4.25rem] xl:text-[5rem]"
        >
          We Build{"\n"}Digital{"\n"}Experiences
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-7 max-w-[65ch] text-base leading-relaxed text-muted">
          We are a creative agency specializing in brand identity, web development, and digital strategy that drives results.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
          <motion.a
            ref={magnetic.ref}
            style={magnetic.style}
            href="https://cal.com/alisamadii"
            target="_blank"
            rel="noopener"
            className="magnetic-btn inline-flex rounded-full bg-primary px-7 py-3 text-[13px] font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgba(252,132,100,0.2)] active:-translate-y-px active:scale-[0.97]"
          >
            Start a Project
          </motion.a>
          <a
            href="https://portal.alisamadii.com/agency"
            className="inline-flex border-b border-border pb-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted transition-colors duration-300 hover:border-text hover:text-text"
          >
            I am a customer
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        className="relative hidden items-center lg:flex"
      >
        <div className="relative w-full overflow-hidden rounded-[2.5rem] shadow-diffuse">
          <img src="https://cdn.alisamadii.com/marketing/agency-hero.webp" alt="Agency work showcase" className="aspect-[4/5] w-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-transparent to-bg/20" />
        </div>
      </motion.div>
    </section>
  );
}
