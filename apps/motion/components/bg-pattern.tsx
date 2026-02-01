import React from "react";

import { cn } from "@workspace/ui/lib/utils";

export const BgPattern = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn("absolute -top-12 left-0 -z-10 h-[110%] w-full", className)}
      style={{
        backgroundImage:
          "radial-gradient(var(--muted) 1.5px, transparent 1.5px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div className="from-background absolute inset-0 bg-linear-to-t to-transparent"></div>
    </div>
  );
};
