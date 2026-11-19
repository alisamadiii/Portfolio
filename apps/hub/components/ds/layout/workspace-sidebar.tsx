"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { isAdminUser } from "@/lib/authz-shared";
import {
  ACCOUNT_PRODUCTS,
  accountNav,
  APPS,
  PROJECT_SETTINGS,
  projectCoreNav,
  SETTINGS_NAV,
  SOURCE_CODE_NAV,
  type AppId,
} from "@/lib/apps";

import { Sidebar, SidebarDivider, SidebarLink, SidebarSection, useIsActive } from "./sidebar";

/**
 * The one sidebar: the focused project's pages (core → "Apps": installed only,
 * then "+ Add apps" → settings by role), then the account pages below. With no
 * project yet, only the account part renders. `showSettings` (full access)
 * also gates Members.
 */
export function WorkspaceSidebar({
  hasProject,
  installed,
  netlify = false,
  orders = false,
  showSettings = true,
  showProjectSettings = false,
  showSourceCode = false,
}: {
  hasProject: boolean;
  installed: readonly AppId[];
  netlify?: boolean;
  /** A delivery app is installed: the Orders page. */
  orders?: boolean;
  showSettings?: boolean;
  /** Owner or admin: the project Settings page. */
  showProjectSettings?: boolean;
  /** Upload project with Website Setup paid (or admin): the Source Code page. */
  showSourceCode?: boolean;
}) {
  const isActive = useIsActive();
  const isAdmin = isAdminUser(useCurrentUser().data?.user);
  const url = (p: string) => `/${p}`;
  return (
    <Sidebar label="Workspace">
      {hasProject && (
        <>
          {projectCoreNav({ netlify, members: showSettings, orders }).map((i) => (
            <SidebarLink key={i.id} item={i} href={url(i.path)} active={isActive(url(i.path), i.path === "")} />
          ))}
          <SidebarSection label="Apps">
            <AnimatePresence initial={false}>
              {APPS.filter((a) => installed.includes(a.id)).map((a) => (
                <motion.div
                  key={a.id}
                  // Clip only while the height animates: a settled wrapper keeps
                  // a measured pixel height that can round short of the 34px
                  // link and shave the active row's bottom corners.
                  initial={{ opacity: 0, height: 0, filter: "blur(4px)", overflow: "hidden" }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    filter: "blur(0px)",
                    transitionEnd: { overflow: "visible", height: "auto" },
                  }}
                  exit={{ opacity: 0, height: 0, filter: "blur(4px)", overflow: "hidden" }}
                  transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                  className="shrink-0"
                >
                  <SidebarLink
                    item={{ id: a.id, label: a.name, icon: a.icon, logo: a.logo, tile: !a.logo, path: a.path }}
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
          {(showSettings || showProjectSettings || showSourceCode) && (
            <>
              <SidebarDivider />
              {[
                ...(showSettings ? PROJECT_SETTINGS : []),
                ...(showSourceCode ? [SOURCE_CODE_NAV] : []),
                ...(showProjectSettings ? [SETTINGS_NAV] : []),
              ].map((i) => (
                <SidebarLink key={i.id} item={i} href={url(i.path)} active={isActive(url(i.path))} />
              ))}
            </>
          )}
          <SidebarDivider />
        </>
      )}
      {accountNav({ isAdmin }).map((i) => (
        // Account is exact so /account/billing lights up Billing only.
        <SidebarLink key={i.id} item={i} href={i.path} active={isActive(i.path, i.path === "/account")} />
      ))}
      <SidebarDivider />
      {ACCOUNT_PRODUCTS.map((i) => (
        <SidebarLink key={i.id} item={i} href={i.path} />
      ))}
    </Sidebar>
  );
}
