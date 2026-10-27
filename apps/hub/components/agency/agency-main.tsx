"use client";

import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

import { projectSubpath } from "@/lib/paths";

// Every agency page uses the shared centered shell now.
const FULL_WIDTH: string[] = [];

// Prefixes whose whole subtree is full-width (section pages self-center).
const FULL_WIDTH_PREFIX = ["/business-info"];

export function AgencyMain({ children }: { children: React.ReactNode }) {
  const pathname = projectSubpath(usePathname());
  const fullWidth =
    FULL_WIDTH.includes(pathname) ||
    FULL_WIDTH_PREFIX.some((p) => pathname.startsWith(p));

  return (
    <div
      className={cn(
        "mx-auto w-full p-6 md:p-12",
        fullWidth ? "max-w-none 2xl:px-12" : "max-w-[1440px]"
      )}
    >
      {children}
    </div>
  );
}
