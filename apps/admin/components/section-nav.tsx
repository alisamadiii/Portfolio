"use client";

import { useEffect, useState } from "react";

import { cn } from "@workspace/ui/lib/utils";

export type SectionNavItem = { id: string; label: string };

/**
 * Anchor-link rail for a single-scroll record page. Sticky vertical list on
 * lg+, horizontal pill row on mobile. Active section tracked with an
 * IntersectionObserver so the rail follows the scroll position.
 */
export const SectionNav = ({
  items,
  className,
}: {
  items: SectionNavItem[];
  className?: string;
}) => {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible.set(entry.target.id, entry.intersectionRatio);
        });
        const top = [...visible.entries()]
          .filter(([, ratio]) => ratio > 0)
          .sort(
            (a, b) =>
              items.findIndex((i) => i.id === a[0]) -
              items.findIndex((i) => i.id === b[0])
          )[0];
        if (top) setActive(top[0]);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.1] }
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:self-start",
        className
      )}
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
            active === item.id
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
};
