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
      className={`w-full cursor-pointer rounded border p-4 duration-150 ${
        checked
          ? "border-success bg-success-darker"
          : "border-background bg-gradient-to-t from-black to-accents-1 hover:border-accents-6"
      }`}
    >
      <div className="space-y-2">{children}</div>
      <div className="relative mt-4 flex justify-center">
        <input
          ref={inputRef}
          type="radio"
          checked={checked}
          value={value}
          className="input-reset-appearance peer h-4 w-4 appearance-none"
          {...props}
        />
        <span className="absolute flex h-4 w-4 items-center justify-center rounded-full border bg-accents-2/50 duration-200 peer-checked:border-success">
          <AnimatePresence>
            {checked && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute h-2 w-2 rounded-full bg-success"
              />
            )}
          </AnimatePresence>
        </span>
      </div>
    </Label>
  );
}

export { Group, Item };
