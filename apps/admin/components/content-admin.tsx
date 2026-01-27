"use client";

import { cn } from "@workspace/ui/lib/utils";

export const Content = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("mx-auto mt-8 max-w-6xl px-4", className)}>
      {children}
    </div>
  );
};
