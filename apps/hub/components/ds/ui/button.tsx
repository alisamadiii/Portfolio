import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

/**
 * Buttons: 36px tall (32px "sm"), 6px radius, 14px/500 text. Never pills.
 * - primary: coral fill + INK text (never white on coral). One per area.
 * - dark:    ink fill + white text. "Copy prompt", "Ask us to add".
 * - outline: white + strong border. Secondary actions.
 * - subtle:  grey fill, no border. "Add feature", "Add segment".
 * - ghost:   text only. Inline "Disconnect".
 */
export type ButtonVariant = "primary" | "dark" | "outline" | "subtle" | "ghost";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-coral text-ink font-semibold hover:brightness-95",
  dark: "bg-ink text-white hover:bg-ink-2",
  outline: "border border-line-strong bg-surface text-ink hover:bg-canvas",
  subtle: "bg-subtle text-ink hover:bg-hover",
  ghost: "text-coral-text hover:text-coral-deep",
};
const sizes: Record<ButtonSize, string> = {
  md: "h-9 px-3.5 text-sm",
  sm: "h-8 px-3 text-[13px]",
};

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function buttonClass(
  variant: ButtonVariant = "outline",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "outline",
  size = "md",
  icon,
  trailingIcon,
  className,
  children,
  type = "button",
  ...props
}: Common & ComponentPropsWithoutRef<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
      {trailingIcon}
    </button>
  );
}

export function ButtonLink({
  variant = "outline",
  size = "md",
  icon,
  trailingIcon,
  className,
  children,
  href,
  ...props
}: Common & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
      {trailingIcon}
    </Link>
  );
}

/** Plain anchor styled as a button (external links). */
export function ButtonAnchor({
  variant = "outline",
  size = "md",
  icon,
  trailingIcon,
  className,
  children,
  ...props
}: Common & ComponentPropsWithoutRef<"a">) {
  return (
    <a className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
      {trailingIcon}
    </a>
  );
}

/** 36×36 square icon button. Always pass aria-label. */
export function IconButton({
  className,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button"> & { "aria-label": string }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-control text-ink-3 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
        className
      )}
      {...props}
    />
  );
}
