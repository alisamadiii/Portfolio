import React from "react";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface Props extends React.HTMLAttributes<HTMLDivElement> {}

function Group({ className, ...props }: Props) {
  return <div {...props} className={cn("", className)} />;
}

interface ItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children: React.ReactNode;
  checked: boolean;
  value: string;
}

function Item({ children, checked, value, ...props }: ItemProps) {
  const inputRef = React.useRef(null);

  return (
    <Label
      className={`p-4 border rounded duration-150 cursor-pointer ${
        checked
          ? "bg-success-darker border-success"
          : "bg-black hover:border-accents-6"
      }`}
    >
      <div>{children}</div>
      <div className="relative flex justify-center mt-4">
        <input
          ref={inputRef}
          type="radio"
          checked={checked}
          value={value}
          className="w-4 h-4 appearance-none peer input-reset-appearance"
          {...props}
        />
        <span className="absolute flex items-center justify-center w-4 h-4 duration-200 border rounded-full bg-accents-2/50 peer-checked:border-success">
          <AnimatePresence>
            {checked && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute w-2 h-2 rounded-full bg-success"
              />
            )}
          </AnimatePresence>
        </span>
      </div>
    </Label>
  );
}

export { Group, Item };
