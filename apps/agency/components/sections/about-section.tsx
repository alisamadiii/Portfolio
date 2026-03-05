"use client";

import { GridCell } from "@/components/grid-cell";
import { SectionLabel } from "@/components/section-label";

export function AboutSection() {
  return (
    <section id="about">
      <GridCell>
        <div className="mx-auto max-w-4xl py-10 text-center">
          <SectionLabel
            text="About Us"
            number="02"
            className="justify-center"
          />
          <h2 className="font-heading mb-8 text-4xl leading-tight font-bold md:text-6xl">
            We craft digital products
            <br />
            that people <span className="text-primary italic">love</span> to use
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
            Founded with a passion for pixel-perfect design and clean code,
            we&apos;ve spent over a decade helping brands transform their
            digital presence. Our approach blends creativity with data-driven
            strategy to deliver experiences that matter.
          </p>
        </div>
      </GridCell>
    </section>
  );
}
