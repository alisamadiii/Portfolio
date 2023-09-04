import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "flex items-center gap-2 rounded font-medium tracking-[-0.02rem] duration-150 focus-visible:outline-none focus-visible:shadow-focus-button disabled:cursor-not-allowed",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
