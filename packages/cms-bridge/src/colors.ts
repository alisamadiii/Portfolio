/**
 * Region-type color language, shared by BOTH the in-iframe edit markers
 * (`client.ts`) and the hub UI (nav/toggle icons) so they always agree.
 * `@alisamadiillc/cms-bridge` is the only package both sides can import.
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
