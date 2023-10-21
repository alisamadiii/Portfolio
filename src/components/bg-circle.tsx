import { cn } from "@/lib/utils";
import React, { type HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {}

export default function BgCircle({ className, ...props }: Props) {
  return <div className={cn("", className)} />;
}
