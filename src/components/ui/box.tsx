import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const boxVariants = cva(
  "w-full p-8 border rounded-xl hover:border-hover duration-200 ease-linear",
  {
    variants: {
      variant: {},
      size: {},
    },
    defaultVariants: {},
  }
);

export interface BoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof boxVariants> {}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        className={cn(boxVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Box.displayName = "Box";

export interface RectProps extends React.HTMLAttributes<HTMLDivElement> {}

const Rect = React.forwardRef<HTMLDivElement, RectProps>(
  ({ className, ...props }, ref) => {
    return <div className={cn("", className)} ref={ref} {...props} />;
  }
);

Rect.displayName = "Rect";

export { Box, boxVariants, Rect };
