import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { HTMLMotionProps, motion } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "flex items-center justify-center gap-2 rounded font-medium tracking-[-0.02rem] transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-focus-button disabled:cursor-not-allowed",
  {
    variants: {
      size: {
        sm: "px-4 h-8",
        md: "px-7 h-10",
        lg: "px-7 h-12",
      },
      variant: {
        default: "bg-button text-button-foreground hover:bg-button/90",
        outline: "border text-accents-6 hover:bg-accents-2 hover:text-white",
        primary: "bg-success hover:bg-success-light",
        error:
          "bg-button bg-error-light text-button-foreground hover:bg-error-light/80",
        github: "bg-[#24292E] h-12 text-white px-16 hover:bg-[#555]",
        google: "bg-white h-12 text-black px-16 hover:bg-accents-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> &
  HTMLMotionProps<"button">;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
