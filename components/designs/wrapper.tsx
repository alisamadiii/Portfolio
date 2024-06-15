import { cn } from "@/utils";
import React, { type HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Wrapper({ children, className, ...props }: Props) {
  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col items-center justify-center bg-white text-black",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
