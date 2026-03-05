"use client";

import { GridCell } from "@/components/grid-cell";
import { MagneticButton } from "@/components/magnetic-button";
import { SectionLabel } from "@/components/section-label";

export function CTASection() {
  return (
    <section id="contact">
      <GridCell className="py-20 md:py-32">
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="bg-accent/5 pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]" />

          <SectionLabel
            text="Get in Touch"
            number="05"
            className="justify-center"
          />
          <h2 className="font-heading relative mb-6 text-5xl font-bold md:text-7xl">
            Let&apos;s Create
            <br />
            Something <span className="text-primary">Amazing</span>
          </h2>
          <p className="text-muted-foreground relative mx-auto mb-10 max-w-lg text-lg">
            Ready to elevate your digital presence? We&apos;d love to hear about
            your project and explore how we can help.
          </p>
          <div className="relative flex flex-wrap justify-center gap-4">
            <MagneticButton>Start a Conversation</MagneticButton>
          </div>
        </div>
      </GridCell>
    </section>
  );
}
