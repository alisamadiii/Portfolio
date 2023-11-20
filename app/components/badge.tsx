import { cn } from "@/utils";
import React, { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {}

export default function Badge({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        "mt-2 inline-block self-start rounded-full bg-foreground px-2 py-px text-xs text-background",
        className
      )}
      {...props}
    />
  );
}
