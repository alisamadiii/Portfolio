"use client";

import { Calendar, Check, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import { fadeUp, staggerContainer } from "./animations";

const bookingFeatures = [
  "Free 30-minute consultation",
  "No commitment required",
  "Custom project roadmap",
  "Transparent pricing",
];

export function Booking() {
  return (
    <section id="booking" className="relative py-24 md:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.723 0.219 149.579 / 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="border-primary/30 mb-4">
              Get Started
            </Badge>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          >
            Ready to <span className="text-primary">Start Your Project</span>?
          </motion.h2>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg"
          >
            Schedule a free consultation to discuss your project. No commitments
            — just a conversation about how we can help your business grow
            online.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            {bookingFeatures.map((f) => (
              <span
                key={f}
                className="text-muted-foreground flex items-center gap-2 text-sm"
              >
                <Check className="text-primary size-4" />
                {f}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mt-8"
          >
            <Button
              size="lg"
              className="h-14 rounded-full px-10 text-base"
              asChild
            >
              <a
                href="https://cal.com/alisamadii"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Calendar className="size-5" />
                Schedule a Free Call
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </motion.div>
        </motion.div>

        {/* Replace YOUR_USERNAME with your actual cal.com link */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl"
        >
          <iframe
            src="https://cal.com/alisamadii?embed=true&theme=dark"
            className="h-[600px] w-full border-none"
            title="Book a call"
          />
        </motion.div>
      </div>
    </section>
  );
}
