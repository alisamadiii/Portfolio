"use client";

import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

// Hub pages share a narrow left-aligned column; the Emails pages need the
// extra width for their table and preview, so they get a wide centered one.
// Home gets a wide column too so the project gallery can span four cards —
// its other sections re-apply the narrow width themselves.
export function HubContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWide = pathname.startsWith("/emails");
  const isHome = pathname === "/";

  return (
    <div
      className={cn(
        "p-6 md:p-10",
        isWide
          ? "mx-auto w-full max-w-[1100px]"
          : isHome
            ? "max-w-[1500px]"
            : "max-w-[860px]"
      )}
    >
      {children}
    </div>
  );
}
