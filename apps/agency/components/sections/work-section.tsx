"use client";

import { ArrowUpRight } from "lucide-react";

import { GridCell } from "@/components/grid-cell";
import { ProjectCard } from "@/components/project-card";
import { SectionLabel } from "@/components/section-label";

const PROJECTS = [
  {
    title: "Nexus Finance Platform",
    category: "Web App",
    tags: ["React", "TypeScript", "Fintech"],
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
  {
    title: "Aura Brand Redesign",
    category: "Branding",
    tags: ["Identity", "Guidelines", "Print"],
    image:
      "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=800&q=80",
  },
  {
    title: "Meridian E-Commerce",
    category: "E-Commerce",
    tags: ["Next.js", "Shopify", "UI/UX"],
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  },
  {
    title: "Pulse Health App",
    category: "Mobile",
    tags: ["React Native", "Health", "API"],
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80",
  },
];

export function WorkSection() {
  return (
    <section id="work">
      <GridCell>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel text="Selected Work" number="04" />
            <h2 className="font-heading text-4xl font-bold md:text-5xl">
              Featured Projects
            </h2>
          </div>
          <a
            href="#"
            className="text-primary group inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] uppercase hover:underline"
          >
            View All Projects
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </GridCell>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {PROJECTS.map((project, i) => (
          <ProjectCard
            key={project.title}
            title={project.title}
            category={project.category}
            tags={project.tags}
            image={project.image}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
