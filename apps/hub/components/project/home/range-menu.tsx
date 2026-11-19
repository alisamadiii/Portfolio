"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { Button } from "@/components/ds/ui/button";

import { HOME_RANGES, type HomeRange } from "./use-home-range";

export function RangeMenu({ range, onChange }: { range: HomeRange; onChange: (next: HomeRange) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" trailingIcon={<ChevronDown className="size-3.5" />}>
            {HOME_RANGES.find((r) => r.value === range)?.label}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {HOME_RANGES.map((r) => (
          <DropdownMenuItem key={r.value} onClick={() => onChange(r.value)}>
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
