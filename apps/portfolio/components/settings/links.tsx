"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

const sidebarLinks = {
  general: "/settings/general",
  billing: "/settings/billing",
  danger: "/settings/danger",
};

export const SettingsLinks = () => {
  const pathname = usePathname();

  return (
    <div className="mb-4 flex space-y-2">
      {Object.entries(sidebarLinks).map(([key, value]) => (
        <Link
          key={key}
          href={value}
          className={buttonVariants({
            variant: "ghost",
            className: cn(
              "justify-start capitalize",
              pathname === value && "bg-muted",
              pathname === "/settings" && key === "general" && "bg-muted"
            ),
          })}
        >
          {key.replaceAll("/", "")}
        </Link>
      ))}
    </div>
  );
};
