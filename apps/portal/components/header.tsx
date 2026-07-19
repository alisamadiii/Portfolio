"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@workspace/ui/components/sidebar";

export const PortalHeader = () => {
  const pathname = usePathname();
  const title = pathname.split("/").pop() || "Settings";

  return (
    <header className="bg-background/85 sticky top-0 z-5 flex w-full items-center gap-3 border-b px-6 py-5 backdrop-blur-md md:px-10">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-[23px] font-extrabold tracking-tight capitalize">
        {title}
      </h1>
    </header>
  );
};
