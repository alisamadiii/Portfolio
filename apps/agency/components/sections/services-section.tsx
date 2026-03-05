"use client";

import {
  Chart2,
  Code,
  Earth,
  Layers,
  Megaphone,
  Paintbrush,
} from "@workspace/ui/icons";

import { GridCell } from "@/components/grid-cell";
import { SectionLabel } from "@/components/section-label";
import { ServiceCard } from "@/components/service-card";

const SERVICES = [
  {
    icon: Paintbrush,
    title: "Brand Identity",
    description:
      "Crafting distinctive visual identities that resonate with your audience and set you apart from the competition.",
  },
  {
    icon: Code,
    title: "Web Development",
    description:
      "Building performant, scalable web applications using cutting-edge technologies and modern frameworks.",
  },
  {
    icon: Earth,
    title: "UI/UX Design",
    description:
      "Designing intuitive interfaces with user-centered methodologies that drive engagement and conversions.",
  },
  {
    icon: Chart2,
    title: "SEO & Analytics",
    description:
      "Data-driven optimization strategies to boost visibility, traffic, and meaningful user engagement.",
  },
  {
    icon: Megaphone,
    title: "Digital Marketing",
    description:
      "Strategic campaigns across channels that amplify your message and deliver measurable results.",
  },
  {
    icon: Layers,
    title: "Product Strategy",
    description:
      "End-to-end product thinking — from discovery and validation to launch and iteration cycles.",
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="relative overflow-hidden">
      <GridCell>
        <SectionLabel text="What We Do" number="03" />
        <h2 className="font-heading mb-4 text-4xl font-bold md:text-5xl">
          Our Services
        </h2>
        <p className="text-muted-foreground max-w-lg">
          Comprehensive digital solutions tailored to elevate your brand and
          accelerate growth.
        </p>
      </GridCell>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service, i) => (
          <ServiceCard
            key={service.title}
            icon={<service.icon />}
            title={service.title}
            description={service.description}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
