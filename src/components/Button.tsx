import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "@/utils";

const buttonVariants = cva("px-4 gap-2 duration-150 active:scale-95", {
  variants: {
    variant: {
      default:
        "py-2 font-medium rounded-md text-white border-b bg-gradient-to-tr from-primary to-secondary",
      twitter:
        "flex items-center py-1 font-bold rounded-full text-twitter bg-twitter/10 hover:bg-twitter hover:text-white",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
