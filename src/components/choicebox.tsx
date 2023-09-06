import React, {
  HTMLAttributes,
  InputHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {}

function Group({ className, ...props }: Props) {
  return <div {...props} className={cn("", className)} />;
}

interface ItemProps extends InputHTMLAttributes<HTMLInputElement> {
  children: React.ReactNode;
  checked: boolean;
  value: string;
}

function Item({ children, checked, value, ...props }: ItemProps) {
  const inputRef = useRef(null);

  return (
    <Label
      className={`p-4 border rounded duration-300 ${
        checked
          ? "bg-success-darker border-success"
          : "bg-black hover:border-accents-6"
      }`}
    >
      <div>{children}</div>
      <input
        ref={inputRef}
        type="radio"
        checked={checked}
        value={value}
        {...props}
      />
    </Label>
  );
}

export { Group, Item };
