"use client";

import { motion } from "motion/react";

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

export function ServiceCard({
  icon,
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
      className="group relative overflow-hidden border-t border-r p-8 md:p-10"
    >
      <div className="via-primary absolute top-0 left-0 h-px w-full scale-x-0 bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 group-hover:scale-x-100" />
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>

      <div className="border-border text-primary/70 group-hover:text-primary group-hover:border-primary/50 group-hover:bg-primary/5 mb-6 flex h-12 w-12 items-center justify-center border transition-all duration-500 [&>svg]:size-5">
        {icon}
      </div>

      <h3 className="font-heading group-hover:text-primary mb-3 text-xl font-semibold transition-colors duration-300">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>

      <div className="font-heading group-hover:text-primary/[0.05] absolute right-4 bottom-4 text-7xl font-bold text-white/[0.02] transition-colors duration-500">
        {String(index + 1).padStart(2, "0")}
      </div>
    </motion.div>
  );
}
