"use client";

import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function ServiceCard({
  icon: Icon,
  title,
  description,
  index,
}: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group border-border relative overflow-hidden border p-8 transition-all duration-500 hover:bg-white/[0.02] md:p-10"
    >
      <div className="via-accent absolute top-0 left-0 h-px w-full scale-x-0 bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 group-hover:scale-x-100" />

      <div className="border-border group-hover:border-accent/50 group-hover:bg-accent/5 mb-6 flex h-12 w-12 items-center justify-center border transition-all duration-500">
        <Icon className="text-accent/70 group-hover:text-accent h-5 w-5 transition-colors duration-500" />
      </div>

      <h3 className="font-heading group-hover:text-accent mb-3 text-xl font-semibold transition-colors duration-300">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>

      <div className="font-heading group-hover:text-accent/[0.05] absolute right-4 bottom-4 text-7xl font-bold text-white/[0.02] transition-colors duration-500">
        {String(index + 1).padStart(2, "0")}
      </div>
    </motion.div>
  );
}
