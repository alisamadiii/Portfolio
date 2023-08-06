import React, { forwardRef, HTMLAttributes } from "react";
import { cva, VariantProps } from "class-variance-authority";
import { cn } from "../utils";

const buttonVariants = cva("rounded-full duration-200", {
  variants: {
    variant: {
      default:
        "text-secondary text-xl p-3 hover:bg-button-hover flex items-center gap-5",
      primary:
        "text-center flex justify-center bg-primary hover:bg-primary-hover text-[17px] text-white font-bold w-full p-3 xl:py-2",
      example:
        "text-center flex justify-center border border-button-hover duration-200 hover:bg-button-hover text-[17px] font-semibold w-full p-3 xl:py-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface Props
  extends HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, Props>(
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

export default Button;
