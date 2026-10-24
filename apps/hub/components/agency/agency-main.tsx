"use client";

import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

// Every agency page now uses the shared 1200px shell. Only the bespoke
// analytics panel (full-bleed, -mx-6) stays edge-to-edge.
const FULL_WIDTH = ["/analytics"];

// Prefixes whose whole subtree is full-width (section pages self-center).
const FULL_WIDTH_PREFIX = ["/business-info"];

export function AgencyMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullWidth =
    FULL_WIDTH.includes(pathname) ||
    FULL_WIDTH_PREFIX.some((p) => pathname.startsWith(p));

  return (
    <div
      className={cn(
        "mx-auto w-full p-6 md:p-12",
        fullWidth ? "max-w-none 2xl:px-12" : "max-w-[1200px]"
      )}
    >
      {children}
    </div>
  );
}
