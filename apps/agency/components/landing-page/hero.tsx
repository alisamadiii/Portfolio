"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { fadeUp, staggerContainer } from "./animations";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
      {/* Radial green glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "min(900px, 100vw)",
          height: "min(900px, 100vw)",
          background:
            "radial-gradient(circle, oklch(0.723 0.219 149.579 / 0.12) 0%, oklch(0.723 0.219 149.579 / 0.03) 40%, transparent 70%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 container text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mx-auto flex max-w-4xl flex-col items-center gap-6"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Badge
              variant="outline"
              className="border-primary/30 gap-2 px-4 py-1.5 text-sm"
            >
              <span className="relative flex size-2">
                <span className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                <span className="bg-primary relative inline-flex size-2 rounded-full" />
              </span>
              Web Development Agency
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            We Build Digital <span className="text-primary">Experiences</span>{" "}
            That Drive Growth
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="text-muted-foreground max-w-2xl text-lg md:text-xl"
          >
            From custom admin panels to full websites, hosting, and business
            emails — we handle your entire digital presence so you can focus on
            what matters most.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <Button
              size="lg"
              className="h-14 rounded-full px-8 text-base"
              asChild
            >
              <Link href="#booking">
                Book a Call
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-full px-8 text-base"
              asChild
            >
              <Link href="#services">Our Services</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
