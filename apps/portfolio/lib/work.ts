import type { ComponentType, SVGProps } from "react";

import { B402, Bless, Crosspost } from "@/components/icons/clients";

export type Tile = {
  name: string;
  /** External URL. Omitted → non-clickable tile. */
  href?: string;
  /** Dims the tile and shows a small status dot. */
  status?: "building" | "planned";
  /** Raster icon (full-bleed, e.g. an iOS app icon in /public). */
  img?: string;
  /** Vector logo glyph, centered on `bg`. */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tile background when the icon is a glyph or monogram. */
  bg?: string;
  /** Monogram/glyph color (defaults to the theme foreground). */
  fg?: string;
  /** Monogram text override (e.g. "HCO"); defaults to the name's initial. */
  label?: string;
};

// Native apps — built, in progress, or planned.
export const apps: Tile[] = [
  // Story — iOS app for keeping a family's memories in one private place.
  { name: "Story", status: "building", img: "/apps/story.png" },
];

// Companies I've built for. Logo SVGs live in components/icons/clients.tsx;
// Area has no glyph, so it falls back to a monogram tile.
// Nonprofit websites built through the agency.
export const nonprofits: Tile[] = [
  {
    name: "Hazara Community of Oregon",
    href: "https://www.hazaraoregon.org/",
    label: "HCO",
    bg: "#D6212C", // news red
    fg: "#fff",
  },
  {
    name: "EmpowerHer Initiative",
    href: "https://www.empowerher-initiative.org/",
    label: "EH",
    bg: "#1D4ED8", // news blue
    fg: "#fff",
  },
];

export const clients: Tile[] = [
  { name: "Crosspost", href: "https://www.crosspost.app/", Icon: Crosspost },
  { name: "Bless", href: "https://bless.network/", Icon: Bless },
  { name: "B402", href: "https://www.b402.ai/", Icon: B402 },
  { name: "Area", href: "https://www.area.club" },
];
