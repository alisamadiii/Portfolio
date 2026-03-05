"use client";

import { GridCell } from "@/components/grid-cell";
import { AnimatedCounter } from "@/components/animated-counter";

const STATS = [
  { value: 150, suffix: "+", label: "Projects Delivered" },
  { value: 98, suffix: "%", label: "Client Satisfaction" },
  { value: 12, suffix: "+", label: "Years Experience" },
  { value: 40, suffix: "+", label: "Team Members" },
];

export function StatsSection() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat, i) => (
        <GridCell key={stat.label} delay={i * 0.1}>
          <div className="text-center">
            <div className="font-heading text-primary mb-2 text-4xl font-bold md:text-5xl">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <p className="text-muted-foreground font-mono text-xs tracking-[0.15em] uppercase">
              {stat.label}
            </p>
          </div>
        </GridCell>
      ))}
    </div>
  );
}
