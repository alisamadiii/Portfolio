"use client";

import { type LucideIcon } from "lucide-react";
import {
  Code2,
  LayoutDashboard,
  Mail,
  Palette,
  Search,
  Server,
  Shield,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@workspace/ui/components/badge";

import { fadeUp, staggerContainer } from "./animations";

const services = [
  {
    icon: LayoutDashboard,
    title: "Rapid Admin Panels",
    description:
      "Custom admin dashboards built with pre-made templates, tailored to your workflow. Launch in days, not months.",
  },
  {
    icon: Code2,
    title: "Custom Web Development",
    description:
      "Hand-crafted, pixel-perfect websites built from the ground up with modern frameworks and best practices.",
  },
  {
    icon: Server,
    title: "Managed Hosting",
    description:
      "Reliable, scalable hosting with 99.9% uptime. We handle the infrastructure so you can focus on your business.",
  },
  {
    icon: Mail,
    title: "Business Email Setup",
    description:
      "Professional email addresses on your domain. Build credibility and trust with every message you send.",
  },
  {
    icon: Search,
    title: "SEO Optimization",
    description:
      "Get discovered online with data-driven SEO strategies that drive organic traffic and real conversions.",
  },
  {
    icon: Palette,
    title: "UI/UX Design",
    description:
      "Beautiful, intuitive interfaces designed for conversion. Modern design that makes users stay and engage.",
  },
  {
    icon: Zap,
    title: "Performance Optimization",
    description:
      "Lightning-fast load times and perfect Core Web Vitals. Speed that search engines and users love.",
  },
  {
    icon: Shield,
    title: "Maintenance & Support",
    description:
      "Ongoing updates, security patches, and proactive monitoring. Your site is always in good hands.",
  },
];

function ServiceCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group border-border bg-card/50 hover:border-primary/40 relative rounded-2xl border p-6 backdrop-blur-sm transition-colors"
    >
      <div className="from-primary/[0.04] absolute inset-0 rounded-2xl bg-linear-to-b to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="bg-primary/10 text-primary group-hover:bg-primary/20 mb-4 inline-flex rounded-xl p-3 transition-colors">
          <Icon className="size-6" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export function Services() {
  return (
    <section id="services" className="relative py-24 md:py-32">
      <div
        className="pointer-events-none absolute top-0 right-0 -translate-y-1/2"
        style={{
          width: 600,
          height: 600,
          background:
            "radial-gradient(circle, oklch(0.723 0.219 149.579 / 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mb-16 text-center"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="border-primary/30 mb-4">
              Services
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          >
            Everything You Need to{" "}
            <span className="text-primary">Go Digital</span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg"
          >
            Comprehensive web solutions tailored to your business. We
            don&apos;t just build websites — we build digital experiences.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {services.map((s) => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
