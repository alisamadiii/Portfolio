"use client";

import { usePathname } from "next/navigation";

import { WorkspaceShell } from "@/components/ds/layout/workspace-shell";

/** Every page except the editor: top bar with the project switcher + the one sidebar. */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const wide = pathname.includes("/business-info/");
  // Edge to edge, scrolling inside: the calendar week, the Leads inbox, the
  // Source Code browser, the Newsletter app (campaign and template editors
  // included) and a client website preview.
  const bleed =
    pathname.endsWith("/calendar") ||
    pathname.endsWith("/leads") ||
    pathname.endsWith("/source-code") ||
    /\/newsletter(\/|$)/.test(pathname) ||
    /^\/client-websites\/[^/]+/.test(pathname);
  return (
    <WorkspaceShell wide={wide} bleed={bleed}>
      {children}
    </WorkspaceShell>
  );
}
