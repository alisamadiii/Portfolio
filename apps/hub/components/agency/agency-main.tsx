"use client";

import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

// Dashboards use the full width; reading pages stay at a comfortable width.
const FULL_WIDTH = ["/agency", "/marketing", "/marketing/conversions"];

export function AgencyMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullWidth = FULL_WIDTH.includes(pathname);

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
