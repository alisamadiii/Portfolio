"use client";

import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

// Hub pages share a narrow left-aligned column; the Emails pages need the
// extra width for their table and preview, so they get a wide centered one.
export function HubContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = pathname.startsWith("/emails");

  return (
    <div
      className={cn(
        "p-6 md:p-10",
        isWide ? "mx-auto w-full max-w-[1100px]" : "max-w-[860px]"
      )}
    >
      {children}
    </div>
  );
}
