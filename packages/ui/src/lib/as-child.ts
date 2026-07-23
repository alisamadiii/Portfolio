import * as React from "react";

/**
 * Radix-style `asChild` compatibility shim for Base UI primitives.
 *
 * Base UI renders a custom element via the `render` prop; Radix used
 * `asChild` + a single child element. This bridges the two so call sites
 * written against Radix (`<Trigger asChild><Button/></Trigger>`) keep working
 * on Base UI components. `render` always wins when both are provided.
 *
 * Mirrors the inline shim in `components/button.tsx`.
 */
export function resolveAsChild(
  asChild: boolean | undefined,
  render: unknown,
  children: React.ReactNode
): { render: unknown; children: React.ReactNode } {
  let resolvedRender = render;
  let resolvedChildren = children;

  if (asChild && !render && children) {
    const child = Array.isArray(children) ? children[0] : children;
    if (child && typeof child === "object" && "type" in child) {
      const { children: grandChildren, ...childProps } =
        (child as React.ReactElement<{ children?: React.ReactNode }>).props ??
        {};
      resolvedRender = {
        ...(child as React.ReactElement),
        props: childProps,
      };
      resolvedChildren = grandChildren;
    }
  }

  return { render: resolvedRender, children: resolvedChildren };
}
