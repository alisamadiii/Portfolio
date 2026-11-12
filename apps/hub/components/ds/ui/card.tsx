import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

/** White card: 1px line border, 10px radius, no shadow. `soft` = sidebar-tinted (tips, side info). */
export function Card({
  soft,
  className,
  ...props
}: ComponentPropsWithoutRef<"section"> & { soft?: boolean }) {
  return (
    <section
      className={cn(
        "rounded-card border border-line",
        soft ? "bg-sidebar" : "bg-surface",
        className
      )}
      {...props}
    />
  );
}

/** Card title row: 16px/600 title, optional right-side action, divider below when `divided`. */
export function CardHeader({
  title,
  action,
  divided,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  divided?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-6 py-4",
        divided && "border-b border-divider",
        className
      )}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}

/** Coral text link with a chevron, e.g. "View all ›". */
export function TextLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-coral-text hover:text-coral-deep"
    >
      {children}
      <ChevronRight className="size-3.5" aria-hidden />
    </Link>
  );
}
