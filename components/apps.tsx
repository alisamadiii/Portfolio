import React from "react";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const icons = [
  {
    value: "Cursor AI",
    label: "Writing code and designing websites.",
  },
  {
    value: "Screen Studio",
    label: "Recording videos.",
  },
  {
    value: "Typefully",
    label: "Scheduling posts for X and LinkedIn.",
  },
];

export default function Apps() {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {icons.map((icon, index) => (
        <TooltipProvider key={index} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                key={index}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border bg-natural-150 p-4",
                  typeof icon.value === "string" &&
                    "text-3xl font-semibold tracking-tighter"
                )}
              >
                {icon.value}
              </div>
            </TooltipTrigger>
            <TooltipContent>{icon.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
