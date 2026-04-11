import { motion } from "motion/react";

const STEPS = [
  { num: "01", title: "Discovery", desc: "Understanding your goals, audience, and competitive landscape through deep research." },
  { num: "02", title: "Strategy", desc: "Defining the roadmap, architecture, and creative direction for maximum impact." },
  { num: "03", title: "Execution", desc: "Bringing the vision to life with meticulous design and robust engineering." },
  { num: "04", title: "Launch & Scale", desc: "Deploying, monitoring, and iterating to ensure sustained growth and performance." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

export function Process() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="mb-16 lg:pl-[clamp(1rem,5vw,6rem)]"
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">04</span> &mdash; Our Process
        </div>
      </motion.div>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 gap-px overflow-hidden rounded-[2.5rem] border border-border bg-border md:grid-cols-2 lg:grid-cols-4"
      >
        {STEPS.map((s) => (
          <motion.div key={s.num} variants={item} className="bg-surface p-8 lg:p-10">
            <div className="mb-4 font-mono text-[11px] tracking-[0.15em] text-primary">{s.num}</div>
            <h3 className="mb-2 text-[17px] font-semibold tracking-tight text-text">{s.title}</h3>
            <p className="text-[14px] leading-relaxed text-muted">{s.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
