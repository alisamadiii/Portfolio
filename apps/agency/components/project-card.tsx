"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

interface ProjectCardProps {
  title: string;
  category: string;
  tags: string[];
  image: string;
  index: number;
  className?: string;
}

export function ProjectCard({
  title,
  category,
  tags,
  image,
  index,
  className,
}: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: index * 0.15 }}
      className={cn(
        "group border-border relative cursor-pointer overflow-hidden border",
        className
      )}
    >
      <div className="via-accent absolute top-0 left-0 z-10 h-px w-full scale-x-0 bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 group-hover:scale-x-100" />

      {/* Image area */}
      <div className="bg-card relative aspect-[4/3] overflow-hidden">
        <div
          className="absolute inset-0 scale-100 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ backgroundImage: `url(${image})` }}
        />
        <div className="absolute inset-0 bg-black/40 transition-colors duration-500 group-hover:bg-black/20" />

        {/* Arrow */}
        <div className="absolute top-4 right-4 flex h-10 w-10 translate-y-2 items-center justify-center border border-white/20 bg-black/30 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="bg-background p-6">
        <p className="text-accent/60 mb-2 font-mono text-xs tracking-[0.15em] uppercase">
          {category}
        </p>
        <h3 className="font-heading group-hover:text-accent mb-3 text-lg font-semibold transition-colors duration-300">
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-border text-muted-foreground hover:border-accent/30 hover:text-accent/70 font-mono text-[10px] tracking-wider uppercase transition-colors"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
