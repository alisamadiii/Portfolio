"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Scans" },
  { href: "/inspect", label: "Inspect" },
  // Admin-only field tool.
  { href: "/workspace", label: "Workspace", adminOnly: true },
];

export const NavPills = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const pathname = usePathname();

  return (
    <nav className="bg-muted flex items-center gap-1 rounded-full p-1">
      {LINKS.filter((link) => !link.adminOnly || isAdmin).map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/" || pathname.startsWith("/scans")
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "bg-foreground text-background rounded-full px-4 py-1.5 text-sm font-medium"
                : "text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
