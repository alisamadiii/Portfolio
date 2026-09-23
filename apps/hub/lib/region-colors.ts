/**
 * Region-type color language for the hub UI (nav/toggle icons). Formerly
 * shared via `@alisamadiillc/cms-bridge`; that package is now a build-time
 * source annotator and no longer ships these, so the hub keeps its own copy.
 */
export type RegionType = "variant" | "collection" | "blog";

/** One color per region type (oklch strings — usable as CSS values directly). */
export const REGION_COLORS: Record<RegionType, string> = {
  variant: "oklch(0.60 0.13 163)", // green
  collection: "oklch(0.55 0.24 300)", // purple
  blog: "oklch(0.80 0.16 90)", // yellow
};

/** The color for a region type (falls back to the variant green). */
export function regionColor(type: string): string {
  return REGION_COLORS[type as RegionType] ?? REGION_COLORS.variant;
}
