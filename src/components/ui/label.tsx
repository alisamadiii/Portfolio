"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { HTMLMotionProps } from "framer-motion";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

type TextProps = React.HTMLAttributes<HTMLLabelElement> &
  VariantProps<typeof labelVariants> &
  HTMLMotionProps<"label">;

const Label = React.forwardRef<HTMLLabelElement, TextProps>(
  ({ className, ...props }, ref) => (
    <motion.label
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    />
  )
);

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
