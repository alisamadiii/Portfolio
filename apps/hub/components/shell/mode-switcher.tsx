"use client";

import { Check, ChevronDown, LayoutGrid, Settings2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Logo } from "@workspace/ui/icons/logo";

export type ShellMode = "canvas" | "settings";

/**
 * Top-left logo dropdown that switches the shell between Canvas and Settings
 * (Framer's mode switcher). The logo is our brand mark — the project name
 * lives in the header center, not here.
 */
export function ModeSwitcher({
  mode,
  onModeChange,
}: {
  mode: ShellMode;
  onModeChange: (mode: ShellMode) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5 pl-1.5">
            <Logo className="size-5" />
            <span className="text-sm font-medium">
              {mode === "settings" ? "Settings" : "Canvas"}
            </span>
            <ChevronDown className="text-muted-foreground size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-44 rounded-lg">
        <DropdownMenuItem onClick={() => onModeChange("canvas")}>
          <LayoutGrid className="size-4" />
          Canvas
          {mode === "canvas" && <Check className="ml-auto size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onModeChange("settings")}>
          <Settings2 className="size-4" />
          Settings
          {mode === "settings" && <Check className="ml-auto size-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
