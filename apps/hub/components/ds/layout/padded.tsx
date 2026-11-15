import type { ReactNode } from "react";

/**
 * The normal page column for full-bleed (AppShell `bleed`) pages: scrolls on
 * its own, with the same gutters and max width as every other page.
 */
export function Padded({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-12 pt-6 sm:px-10 sm:pt-8">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-5">{children}</div>
    </div>
  );
}
