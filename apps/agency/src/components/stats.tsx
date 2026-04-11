import { motion } from "motion/react";
import { useCounter } from "../hooks/use-counter";

const STATS = [
  { target: 6, suffix: "+", label: "Projects Delivered" },
  { target: 98, suffix: "%", label: "Client Satisfaction" },
  { target: 5, suffix: "+", label: "Years Experience" },
  { target: 1, suffix: "", label: "Team Members" },
];

function Stat({ target, suffix, label, i }: { target: number; suffix: string; label: string; i: number }) {
  const counterRef = useCounter(target, suffix);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
    >
      <div ref={counterRef} className="font-mono text-[2.75rem] font-bold tracking-tighter text-text">0</div>
      <div className="mt-2 text-[13px] text-muted">{label}</div>
    </motion.div>
  );
}

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
      <div className="grid grid-cols-2 gap-y-16 md:grid-cols-4 md:gap-x-12">
        {STATS.map((s, i) => <Stat key={s.label} {...s} i={i} />)}
      </div>
    </section>
  );
}
