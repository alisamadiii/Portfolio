"use client";

import { motion } from "motion/react";

import { Badge } from "@workspace/ui/components/badge";

import { fadeUp, staggerContainer } from "./animations";

const processSteps = [
  {
    step: "01",
    title: "Discovery",
    description:
      "We learn about your business, goals, and audience to craft the perfect digital strategy.",
  },
  {
    step: "02",
    title: "Design",
    description:
      "Wireframes and mockups are created and refined until the design aligns with your vision.",
  },
  {
    step: "03",
    title: "Develop",
    description:
      "Clean, performant code brings the design to life using modern technologies and best practices.",
  },
  {
    step: "04",
    title: "Launch & Scale",
    description:
      "Your project goes live with ongoing support, monitoring, and optimization to help you grow.",
  },
];

export function Process() {
  return (
    <section id="process" className="relative py-24 md:py-32">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mb-16 text-center"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="border-primary/30 mb-4">
              Process
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          >
            Simple Process,{" "}
            <span className="text-primary">Powerful Results</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg"
          >
            From idea to launch, we follow a proven process that delivers
            results on time and on budget.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="relative grid gap-8 md:grid-cols-4"
        >
          <div className="from-border via-primary/30 to-border pointer-events-none absolute top-12 right-16 left-16 hidden h-px bg-linear-to-r md:block" />

          {processSteps.map((step) => (
            <motion.div
              key={step.step}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="relative text-center"
            >
              <div className="border-primary/30 bg-background relative mx-auto mb-6 flex size-24 items-center justify-center rounded-full border-2">
                <span className="text-primary text-2xl font-bold">
                  {step.step}
                </span>
              </div>
              <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
