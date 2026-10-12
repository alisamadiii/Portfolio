"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { HelpCircle, PaintbrushSparkle } from "@/components/icon";
import type { SessionSkill } from "@/components/canvas/slash-skills-menu";

/** Chips shown before the "+N more" toggle. */
const VISIBLE = 5;

const chipClass =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] whitespace-nowrap transition-colors";

/**
 * One-click skill launcher above the session chat composer. Lists the client
 * repo's .claude/skills (same source as the "/" menu); clicking a chip sends
 * "/<name>" straight to the AI.
 */
export function SkillChips({
  skills,
  disabled,
  onRun,
}: {
  skills: SessionSkill[];
  disabled: boolean;
  onRun: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!skills.length) return null;
  const overflow = skills.length - VISIBLE;
  const shown = expanded || overflow <= 0 ? skills : skills.slice(0, VISIBLE);

  return (
    <div className="mb-2">
      <div className="text-muted-foreground mb-1.5 flex items-center gap-1 px-1 text-[11px] font-medium">
        Skills
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label="What are skills?"
                className="hover:text-foreground cursor-help rounded-full"
              >
                <HelpCircle className="size-3.5" />
              </button>
            }
          />
          <TooltipContent side="top" sideOffset={6} className="max-w-xs">
            Skills are ready-made instructions for this site, like adding a
            story or updating the team. Click one to start; the AI will ask for
            anything it needs. You can also type / in the chat.
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        className={cn(
          "flex flex-wrap gap-1.5",
          expanded && "max-h-28 overflow-y-auto"
        )}
      >
        {shown.map((skill) => (
          <Tooltip key={skill.name}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setExpanded(false);
                    onRun(skill.name);
                  }}
                  className={cn(
                    chipClass,
                    "bg-primary/10 text-primary hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-50"
                  )}
                >
                  <PaintbrushSparkle className="size-3 shrink-0" />
                  <span>/{skill.name}</span>
                </button>
              }
            />
            {skill.description && (
              <TooltipContent side="top" sideOffset={6} className="max-w-xs">
                {skill.description}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className={cn(
              chipClass,
              "text-muted-foreground hover:text-foreground border border-dashed"
            )}
          >
            {expanded ? "Show less" : `+${overflow} more`}
          </button>
        )}
      </div>
    </div>
  );
}
