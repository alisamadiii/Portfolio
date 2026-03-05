"use client";

import { GridCell } from "@/components/grid-cell";
import { Marquee } from "@/components/marquee";

const MARQUEE_ITEMS = [
  "DESIGN",
  "DEVELOP",
  "DELIVER",
  "BRAND",
  "STRATEGY",
  "INNOVATE",
];

export function MarqueeSection() {
  return (
    <GridCell noPadding className="py-8">
      <Marquee items={MARQUEE_ITEMS} />
    </GridCell>
  );
}
