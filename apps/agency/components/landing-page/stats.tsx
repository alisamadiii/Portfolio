"use client";

import { motion } from "motion/react";

import { fadeUp, staggerContainer } from "./animations";

const stats = [
  { value: "50+", label: "Projects Delivered" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "<48h", label: "Response Time" },
  { value: "24/7", label: "Support Available" },
];

export function Stats() {
  return (
    <section className="border-border/50 relative border-y">
      <div className="container py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid grid-cols-2 gap-8 md:grid-cols-4"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="text-primary text-3xl font-bold md:text-4xl">
                {s.value}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {s.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
