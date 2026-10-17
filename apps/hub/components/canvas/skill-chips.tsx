"use client";

import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { HelpCircle, PaintbrushSparkle } from "@/components/icon";
import {
  parseSkillDescription,
  type SessionSkill,
} from "@/components/canvas/slash-skills-menu";

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
            delay={0}
            render={
              <button
                type="button"
                aria-label="What are skills?"
                className="hover:text-foreground -m-1 cursor-help rounded-full p-1"
              >
                <HelpCircle className="size-3.5" />
              </button>
            }
          />
          <TooltipContent
            side="top"
            sideOffset={6}
            className="max-w-xs px-3 py-2.5 text-left text-wrap"
          >
            <p className="mb-1 font-medium">What are skills?</p>
            <p className="text-background/85 leading-snug">
              Ready-made tasks set up for this site, like adding a page or
              updating your business info. Click one and the AI does it,
              asking you for anything it needs. You can also type / in the
              chat to pick one.
            </p>
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
              // Chips sit right above the composer: a hover on the way to the
              // input must not flash a tooltip, so wait like a native title.
              delay={600}
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
              <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-xs px-3 py-2.5 text-left text-wrap"
              >
                <SkillTooltipBody description={skill.description} />
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

function SkillTooltipBody({ description }: { description: string }) {
  const { summary, examples } = parseSkillDescription(description);
  return (
    <div className="space-y-2">
      <p className="leading-snug">{summary}</p>
      {examples.length > 0 && (
        <div>
          <p className="text-background/60 mb-1 text-[10px] font-medium tracking-wide uppercase">
            Try saying
          </p>
          <ul className="space-y-0.5">
            {examples.map((example) => (
              <li key={example} className="text-background/85 leading-snug">
                &ldquo;{example}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
