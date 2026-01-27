"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui/lib/utils";

const links = [
  { label: "Overview", href: "/" },
  { label: "Users", href: "/users" },
  { label: "Products", href: "/products" },
  { label: "Discounts", href: "/discounts" },
  {
    label: "Subscriptions",
    href: `${process.env.NEXT_PUBLIC_POLAR_URL}/sales/subscriptions`,
  },
  { label: "Files", href: "/files" },
];

export const NavbarAdmin = () => {
  const pathname = usePathname();
  const isActive = (link: (typeof links)[number]) =>
    link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

  return (
    <div className="bg-muted sticky top-0 z-50 w-full border-b px-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          target={link.href.startsWith("https") ? "_blank" : undefined}
          className={cn(
            "text-muted-foreground hover:text-foreground inline-block border-b border-transparent p-3 text-sm capitalize transition-[colors] duration-200",
            isActive(link) && "border-b-foreground text-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
};
