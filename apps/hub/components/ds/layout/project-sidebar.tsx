"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { APPS, PROJECT_SETTINGS, projectCoreNav, type AppId } from "@/lib/apps";

import { Sidebar, SidebarDivider, SidebarLink, SidebarSection, useIsActive } from "./sidebar";

/**
 * Project sidebar: core → "Apps" (installed only, then "+ Add apps") →
 * settings. `showSettings` (full access) also gates Members.
 */
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
      {projectCoreNav({ netlify, members: showSettings }).map((i) => (
        <SidebarLink key={i.id} item={i} href={url(i.path)} active={isActive(url(i.path), i.path === "")} />
      ))}
      <SidebarSection label="Apps">
        <AnimatePresence initial={false}>
          {APPS.filter((a) => installed.includes(a.id)).map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
              exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="overflow-hidden"
            >
              <SidebarLink
                item={{ id: a.id, label: a.name, icon: a.icon, logo: a.logo, path: a.path }}
                href={url(a.path)}
                active={isActive(url(a.path))}
              />
            </motion.div>
          ))}
        </AnimatePresence>
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
