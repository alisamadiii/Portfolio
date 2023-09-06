import React from "react";

import { VariantProps, cva } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "./label";

const checkboxVariants = cva("", {
  variants: {
    variant: {},
  },
});

interface Props
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof checkboxVariants> {
  checked: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  ({ className, variant, checked, ...props }, ref) => {
    return (
      <Label className={cn("relative checkbox_label", className)}>
        <input
          ref={ref}
          type="checkbox"
          className="w-4 h-4 appearance-none peer input-reset-appearance"
          checked={checked}
          {...props}
        />
        <span className="absolute top-0 left-0 flex items-center justify-center w-4 h-4 duration-100 border rounded-sm bg-accents-2/50 peer-checked:bg-success peer-checked:border-success-dark">
          <AnimatePresence initial={false}>
            {checked && (
              <motion.svg
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                width="10"
                height="9"
                viewBox="0 0 10 9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="inline-block"
              >
                <motion.path
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.2066 8.61833C3.26868 8.70116 3.34566 8.77502 3.43669 8.83571C3.60559 8.94831 3.79776 8.99881 3.98627 8.99259C4.19628 8.98666 4.40555 8.91039 4.57601 8.76124C4.65901 8.68862 4.7261 8.60459 4.77699 8.51353L9.2946 1.7373C9.5815 1.30697 9.46522 0.725535 9.03489 0.438637C8.60455 0.151739 8.02312 0.268018 7.73622 0.698353L3.85686 6.51723L2.00454 4.40029C1.66396 4.01106 1.07233 3.97162 0.683097 4.3122C0.293862 4.65278 0.25442 5.24441 0.595001 5.63364L3.2066 8.61833Z"
                  fill="white"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </span>
      </Label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
