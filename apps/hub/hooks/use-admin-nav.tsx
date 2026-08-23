"use client";

import { useMemo } from "react";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { Database, Settings, SlidersHorizontal, Users } from "@/components/icon";

import { isAdminUser } from "@/lib/authz-shared";
import { isCacheEnabled, isConfigEnabled } from "@workspace/cms-core/config";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

/** Admin page links, gated on the current user + config flags. Empty for non-admins. */
export function useAdminNavItems(): NavItem[] {
  const { config } = useConfig();
  const { user } = useUser();

  return useMemo<NavItem[]>(() => {
    if (!config) return [];
    const canManageRepo = isAdminUser(user);

    const items: NavItem[] = [];

    const configObject = (config.object as any) ?? {};

    if (canManageRepo && isCacheEnabled(configObject)) {
      items.push({
        key: "admin-cache",
        label: "Cache",
        href: `/${config.repo}/cache`,
        icon: <Database className="size-4" />,
      });
    }

    if (canManageRepo && isConfigEnabled(configObject)) {
      items.push({
        key: "admin-configuration",
        label: "Configuration",
        href: `/${config.repo}/configuration`,
        icon: <Settings className="size-4" />,
      });
    }

    if (canManageRepo) {
      items.push({
        key: "admin-collaborators",
        label: "Collaborators",
        href: `/${config.repo}/collaborators`,
        icon: <Users className="size-4" />,
      });
    }

    if (canManageRepo) {
      items.push({
        key: "admin-settings",
        label: "Settings",
        href: `/${config.repo}/settings`,
        icon: <SlidersHorizontal className="size-4" />,
      });
    }

    return items;
  }, [config, user]);
}
