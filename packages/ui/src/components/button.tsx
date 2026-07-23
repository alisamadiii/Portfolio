"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { type VariantProps } from "class-variance-authority";

import { buttonVariants } from "@workspace/ui/components/button-variants";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

function Button({
  className,
  variant = "default",
  size = "default",
  isLoading,
  nativeButton,
  render,
  asChild,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
    /** @deprecated Use `render` prop instead */
    asChild?: boolean;
  }) {
  // asChild compat: if asChild is true and children is a single React element,
  // use it as the render prop
  let resolvedRender = render;
  let resolvedChildren = children;
  if (asChild && !render && children) {
    const child = Array.isArray(children) ? children[0] : children;
    if (child && typeof child === "object" && "type" in child) {
      const { children: grandChildren, ...childProps } = child.props ?? {};
      resolvedRender = { ...child, props: childProps };
      resolvedChildren = grandChildren;
    }
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      nativeButton={nativeButton ?? (resolvedRender ? false : undefined)}
      render={resolvedRender}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Spinner className="size-4" /> : resolvedChildren}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
