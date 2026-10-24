"use client";

import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

// Dashboards use the full width; reading pages stay at a comfortable width.
const FULL_WIDTH = [
  "/agency",
  "/marketing",
  "/marketing/conversions",
  "/marketing/budget",
  "/marketing/search-terms",
  "/analytics",
  "/reports",
];

// Prefixes whose whole subtree is full-width (section pages share a route).
const FULL_WIDTH_PREFIX = ["/business-info"];

export function AgencyMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullWidth =
    FULL_WIDTH.includes(pathname) ||
    FULL_WIDTH_PREFIX.some((p) => pathname.startsWith(p));

  return (
    <div
      className={cn(
        "mx-auto w-full p-6 md:p-10",
        fullWidth ? "max-w-none 2xl:px-12" : "max-w-[1200px]"
      )}
    >
      {children}
    </div>
  );
}
