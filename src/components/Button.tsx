import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "@/utils";

const buttonVariants = cva("px-4 flex items-center gap-2", {
  variants: {
    variant: {
      default:
        "py-2 font-medium rounded-md text-white border-b bg-gradient-to-tr from-primary to-secondary",
      twitter:
        "py-1 font-bold duration-150 rounded-full text-twitter bg-twitter/10 hover:bg-twitter hover:text-white",
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

export { Button, buttonVariants };
