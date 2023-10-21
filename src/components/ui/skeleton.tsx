import React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton relative overflow-hidden rounded-md bg-accents-4",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
