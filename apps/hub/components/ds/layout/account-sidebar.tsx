"use client";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { isAdminUser } from "@/lib/authz-shared";
import { ACCOUNT_PRODUCTS, accountNav } from "@/lib/apps";

import { Sidebar, SidebarDivider, SidebarLink, useIsActive } from "./sidebar";

export function AccountSidebar() {
  const isActive = useIsActive();
  const isAdmin = isAdminUser(useCurrentUser().data?.user);
  return (
    <Sidebar label="Main">
      {accountNav({ isAdmin }).map((i) => (
        <SidebarLink key={i.id} item={i} href={i.path} active={isActive(i.path, i.path === "/")} />
      ))}
      <SidebarDivider />
      {ACCOUNT_PRODUCTS.map((i) => (
        <SidebarLink key={i.id} item={i} href={i.path} />
      ))}
    </Sidebar>
  );
}
