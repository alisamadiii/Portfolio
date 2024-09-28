import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Wrapper({ children }: Props) {
  return <div className="relative mb-12 px-6 md:px-0">{children}</div>;
}

export function Code({ children, className }: Props) {
  return (
    <div className={cn("mx-auto mb-[10px] max-w-3xl", className)}>
      {children}
    </div>
  );
}

export function Preview({ children, className }: Props) {
  return (
    <div data-preview className="relative [&+[data-preview]]:mt-6">
      <div
        className={cn(
          "border-wrapper relative isolate mx-auto flex min-h-96 max-w-3xl flex-col items-center justify-center overflow-hidden rounded-md bg-natural-150 px-8 py-8 shadow-custom-card",
          className
        )}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-0 -inset-y-[6px] border-y-2 border-dashed border-natural-200"></div>
    </div>
  );
}

export function Settings({ children, className }: Props) {
  return (
    <div className={cn("mx-auto mt-[48px] max-w-3xl px-4", className)}>
      {children}
    </div>
  );
}
