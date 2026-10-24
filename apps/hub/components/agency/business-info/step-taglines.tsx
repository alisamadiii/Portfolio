"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { stepFor } from "@/components/agency/business-info-config";
import { AiHelper } from "@/components/agency/business-info/ai-helper";
import {
  FrameCard,
  StepShell,
} from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { Plus, X } from "@/components/icon";

const STEP = stepFor("taglines")!;
const PROMPT = STEP.prompts![0]!;

export function StepTaglines() {
  const bi = useBusinessInfo([{ key: "taglines", initial: 5 }]);
  const rows = bi.draft.taglines ?? [];

  return (
    <StepShell
      stepKey="taglines"
      footer={{
        dirty: bi.dirty,
        saving: bi.saving,
        savedAt: bi.savedAt,
        saveAnd: bi.saveAnd,
      }}
      aside={<AiHelper prompt={PROMPT} values={bi.values} />}
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : (
        <FrameCard innerClassName="flex flex-col gap-3 p-8">
          {rows.map((tagline, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-muted-foreground w-7 shrink-0 font-mono text-[14px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Input
                aria-label={`Tagline ${i + 1}`}
                value={tagline}
                placeholder="e.g. Fast, friendly, done right."
                className="h-auto flex-1 px-4 py-3 text-[17px]"
                onChange={(e) => bi.setRow("taglines", i, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove tagline ${i + 1}`}
                className="size-11 shrink-0"
                disabled={rows.length <= 1}
                onClick={() => bi.removeRow("taglines", i)}
              >
                <X className="size-4.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            className="bg-foreground/5 hover:bg-foreground/8 ml-10 self-start rounded-[11px] px-4 text-[15px]"
            onClick={() => bi.addRow("taglines")}
          >
            <Plus className="size-4" /> Add tagline
          </Button>
        </FrameCard>
      )}
    </StepShell>
  );
}
