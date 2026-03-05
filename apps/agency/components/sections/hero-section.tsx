"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { GridCell } from "@/components/grid-cell";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionLabel } from "@/components/section-label";

export function HeroSection() {
  return (
    <section className="pt-16">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <GridCell className="flex min-h-[70vh] flex-col justify-center lg:min-h-[85vh]">
          <SectionLabel text="Creative Agency" number="01" />

          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-heading mb-6 text-5xl leading-[0.9] font-bold tracking-tight md:text-7xl lg:text-8xl"
          >
            We Build
            <br />
            <span className="text-primary">Digital</span>
            <br />
            Experiences
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-muted-foreground mb-10 max-w-md text-base leading-relaxed"
          >
            We are a creative agency specializing in brand identity, web
            development, and digital strategy that drives results.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <MagneticButton>Start a Project</MagneticButton>
            <a
              href="#work"
              className="text-muted-foreground hover:text-foreground border-border hover:border-foreground/20 group inline-flex items-center gap-2 border px-8 py-4 font-mono text-sm tracking-[0.15em] uppercase transition-all duration-300"
            >
              View Work
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </GridCell>

        <GridCell noPadding className="relative hidden min-h-[85vh] lg:block">
          <div className="from-accent/5 to-accent/10 absolute inset-0 bg-gradient-to-br via-transparent" />
          <img
            src="https://cdn.alisamadii.com/marketing/agency-hero.webp"
            alt="Hero"
            className="h-full w-full object-cover object-right"
          />
        </GridCell>
      </div>
    </section>
  );
}
