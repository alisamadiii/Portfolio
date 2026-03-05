"use client";

import { Code, Earth, Lightning, TrendingUp } from "@workspace/ui/icons";

import { GridCell } from "@/components/grid-cell";
import { SectionLabel } from "@/components/section-label";

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Discovery",
    desc: "Understanding your goals, audience, and competitive landscape through deep research.",
    icon: Lightning,
  },
  {
    step: "02",
    title: "Strategy",
    desc: "Defining the roadmap, architecture, and creative direction for maximum impact.",
    icon: TrendingUp,
  },
  {
    step: "03",
    title: "Execution",
    desc: "Bringing the vision to life with meticulous design and robust engineering.",
    icon: Code,
  },
  {
    step: "04",
    title: "Launch & Scale",
    desc: "Deploying, monitoring, and iterating to ensure sustained growth and performance.",
    icon: Earth,
  },
];

export function ProcessSection() {
  return (
    <section>
      <GridCell>
        <SectionLabel text="How We Work" number="04" />
        <h2 className="font-heading mb-4 text-4xl font-bold md:text-5xl">
          Our Process
        </h2>
      </GridCell>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {PROCESS_STEPS.map((item, i) => (
          <GridCell key={item.step} delay={i * 0.1}>
            <div className="relative">
              <item.icon className="text-primary/60 mb-6 size-10" />
              <span className="font-heading absolute top-0 right-0 text-5xl font-bold text-white/[0.03]">
                {item.step}
              </span>
              <h3 className="font-heading mb-2 text-lg font-semibold">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          </GridCell>
        ))}
      </div>
    </section>
  );
}
