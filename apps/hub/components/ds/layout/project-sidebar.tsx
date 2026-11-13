"use client";

import { Plus } from "lucide-react";

import { APPS, NETLIFY_NAV, PROJECT_CORE, PROJECT_SETTINGS, type AppId } from "@/lib/apps";

import { Sidebar, SidebarDivider, SidebarLink, SidebarSection, useIsActive } from "./sidebar";

/** Project sidebar: core → "Apps" (installed only, then "+ Add apps") → settings. */
export function ProjectSidebar({
  base,
  installed,
  netlify = false,
  showSettings = true,
}: {
  base: string;
  installed: readonly AppId[];
  netlify?: boolean;
  showSettings?: boolean;
}) {
  const isActive = useIsActive();
  const url = (p: string) => (p ? `${base}/${p}` : base);
  return (
    <Sidebar label="Project">
      {(netlify ? [...PROJECT_CORE, NETLIFY_NAV] : PROJECT_CORE).map((i) => (
        <SidebarLink key={i.id} item={i} href={url(i.path)} active={isActive(url(i.path), i.path === "")} />
      ))}
      <SidebarSection label="Apps">
        {APPS.filter((a) => installed.includes(a.id)).map((a) => (
          <SidebarLink
            key={a.id}
            item={{ id: a.id, label: a.name, icon: a.icon, path: a.path }}
            href={url(a.path)}
            active={isActive(url(a.path))}
          />
        ))}
        <SidebarLink
          item={{ id: "apps", label: "Add apps", icon: Plus, path: "apps" }}
          href={url("apps")}
          active={isActive(url("apps"))}
          muted
        />
      </SidebarSection>
      {showSettings && (
        <>
          <SidebarDivider />
          {PROJECT_SETTINGS.map((i) => (
            <SidebarLink key={i.id} item={i} href={url(i.path)} active={isActive(url(i.path))} />
          ))}
        </>
      )}
    </Sidebar>
  );
}
