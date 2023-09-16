import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {}

export default function BgCircle({ className, ...props }: Props) {
  return <div className={cn("", className)} />;
}
