import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textVariants = cva("", {
  variants: {
    variant: {
      h1: "text-[40px] font-lora font-semibold leading-[125%]",
      h2: "text-[24px] md:text-[32px] font-lora font-semibold leading-[125%]",
      h3: "text-2xl font-lora font-semibold leading-[125%]",
      h4: "text-lg font-lora font-semibold leading-[125%]",
      h5: "text-sm font-lora font-semibold leading-[125%]",
      "p1-r": "leading-[150%]",
      "p1-b": "leading-[150%] font-medium",
      "p2-r": "leading-[150%] text-sm",
      "p2-b": "leading-[150%] text-sm font-medium",
      "p3-r": "leading-[150%] text-xs",
      "p3-b": "leading-[150%] text-xs font-medium",
    },
  },
  defaultVariants: {
    variant: "p1-r",
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  element?: "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span";
}

const Text = React.forwardRef<
  HTMLElement | HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement,
  TextProps
>(({ className, variant, element = "p", ...props }, ref) => {
  const Element = element;

  return (
    <Element
      className={cn(textVariants({ variant, className }))}
      ref={ref as any}
      {...props}
    />
  );
});
Text.displayName = "Text";

export { Text, textVariants };
