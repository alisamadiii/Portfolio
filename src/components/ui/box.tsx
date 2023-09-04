import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

const boxVariants = cva(
  "w-full bg-background p-8 border rounded-xl hover:border-hover duration-200 ease-linear",
  {
    variants: {
      variant: {},
      size: {},
    },
    defaultVariants: {},
  }
);

type BoxProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof boxVariants> &
  HTMLMotionProps<"div">;

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <motion.div
        className={cn(boxVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Box.displayName = "Box";

type RectProps = React.HTMLAttributes<HTMLDivElement> & HTMLMotionProps<"div">;

const Rect = React.forwardRef<HTMLDivElement, RectProps>(
  ({ className, ...props }, ref) => {
    return <motion.div className={cn("", className)} ref={ref} {...props} />;
  }
);

Rect.displayName = "Rect";

export { Box, boxVariants, Rect };
