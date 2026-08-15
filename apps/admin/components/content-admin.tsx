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
    <div className={cn("mx-auto w-full max-w-screen-2xl", className)}>
      {children}
    </div>
  );
};
