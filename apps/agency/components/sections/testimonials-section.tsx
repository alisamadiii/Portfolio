"use client";

import { Star } from "lucide-react";

import { GridCell } from "@/components/grid-cell";
import { SectionLabel } from "@/components/section-label";

const TESTIMONIALS = [
  {
    name: "Sarah Johnson",
    role: "CEO, TechVentures",
    text: "The team transformed our digital presence completely. The results exceeded every expectation we had.",
  },
  {
    name: "Michael Chen",
    role: "Founder, StartupLab",
    text: "Incredible attention to detail and a deep understanding of modern design principles. Truly world-class work.",
  },
  {
    name: "Emily Rodriguez",
    role: "CMO, ScaleUp Inc",
    text: "They don't just build websites — they craft experiences. Our conversion rates increased by 340% post-launch.",
  },
];

export function TestimonialsSection() {
  return (
    <section>
      <GridCell>
        <SectionLabel text="Testimonials" number="06" />
        <h2 className="font-heading text-4xl font-bold md:text-5xl">
          What Clients Say
        </h2>
      </GridCell>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <GridCell key={t.name} delay={i * 0.15}>
            <div className="flex h-full flex-col">
              <div className="mb-6 flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="fill-accent text-primary h-4 w-4"
                  />
                ))}
              </div>
              <p className="text-foreground/90 mb-8 flex-1 text-base leading-relaxed italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <p className="font-heading text-sm font-semibold">
                  {t.name}
                </p>
                <p className="text-muted-foreground text-xs">{t.role}</p>
              </div>
            </div>
          </GridCell>
        ))}
      </div>
    </section>
  );
}
