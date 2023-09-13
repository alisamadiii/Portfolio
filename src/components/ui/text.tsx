import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textVariants = cva("", {
  variants: {
    size: {
      48: "text-5xl",
      32: "text-4xl",
      24: "text-2xl",
      20: "text-xl",
      16: "text-base",
      14: "text-sm",
      12: "text-xs",
      10: "text-xxs",
    },
    variant: {
      "muted-lg": "leading-[2rem] font-normal text-accents-6",
      "muted-base": "leading-[1.5rem] text-accents-6",
      "muted-sm": "leading-[1.25rem] text-accents-6",
      "space-grotesk": "font-space_grotesk text-accents-6",
      "section-name":
        "text-xs tracking-[0.255rem] uppercase text-center text-accents-6",
    },
  },
  defaultVariants: {},
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "small" | "span";
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, size, as: Element = "p", ...props }, ref) => {
    return (
      <Element
        className={cn(textVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Text.displayName = "Text";

export { Text, textVariants };
