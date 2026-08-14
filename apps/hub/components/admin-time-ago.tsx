"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

export function AdminTimeAgo({
  label,
  fullDate,
}: {
  label: string;
  fullDate: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="text-foreground cursor-help text-sm">{label}</span>
        }
      />
      <TooltipContent sideOffset={6}>{fullDate}</TooltipContent>
    </Tooltip>
  );
}
