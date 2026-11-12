"use client";

import { ACCOUNT_NAV, ACCOUNT_PRODUCTS } from "@/lib/apps";

import { Sidebar, SidebarDivider, SidebarLink, useIsActive } from "./sidebar";

export function AccountSidebar() {
  const isActive = useIsActive();
  return (
    <Sidebar label="Main">
      {ACCOUNT_NAV.map((i) => (
        <SidebarLink key={i.id} item={i} href={i.path} active={isActive(i.path, i.path === "/")} />
      ))}
      <SidebarDivider />
      {ACCOUNT_PRODUCTS.map((i) => (
        <SidebarLink key={i.id} item={i} href={i.path} />
      ))}
    </Sidebar>
  );
}
