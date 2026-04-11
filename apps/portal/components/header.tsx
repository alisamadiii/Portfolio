"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@workspace/ui/components/sidebar";

export const PortalHeader = () => {
  const pathname = usePathname();
  const title = pathname.split("/").pop() || "Portal";

  return (
    <header className="bg-muted flex w-full items-center border-b px-4 py-4">
      <SidebarTrigger />
      <h1 className="text-2xl font-bold capitalize">{title}</h1>
    </header>
  );
};
