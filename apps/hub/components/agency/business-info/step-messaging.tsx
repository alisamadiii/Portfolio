"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { splitSegment, stepFor } from "@/components/agency/business-info-config";
import { AiHelper } from "@/components/agency/business-info/ai-helper";
import { StepShell } from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { SegmentCard } from "@/components/ds/business-info/form-parts";
import { Field, Input, Textarea } from "@/components/ds/ui/field";

const STEP = stepFor("messaging")!;
const PROMPT = STEP.prompts![0]!;

const KEYS = [
  { key: "messagingProblem", initial: 3 },
  { key: "messagingSolution", initial: 3 },
  { key: "messagingKeyMessage", initial: 3 },
];

const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export function StepMessaging() {
  const bi = useBusinessInfo(KEYS);

  // One card per saved segment, titled with its "who" half.
  const titles = (bi.values.segments ?? []).map((row) => splitSegment(row).who).filter(Boolean);
  const blocks = Math.max(3, titles.length);

  return (
    <StepShell
      stepKey="messaging"
      footer={{ dirty: bi.dirty, saving: bi.saving, savedAt: bi.savedAt, saveAnd: bi.saveAnd }}
      aside={<AiHelper prompt={PROMPT} values={bi.values} />}
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : (
        Array.from({ length: blocks }, (_, i) => {
          const keyMessage = bi.draft.messagingKeyMessage?.[i] ?? "";
          const words = wordCount(keyMessage);
          return (
            <SegmentCard key={i} index={i + 1} title={titles[i] ?? `Segment ${i + 1}`}>
              <Field label="Problem" hint="The key pain point this segment experiences.">
                <Textarea
                  rows={2}
                  value={bi.draft.messagingProblem?.[i] ?? ""}
                  onChange={(e) => bi.setRow("messagingProblem", i, e.target.value)}
                />
              </Field>
              <Field label="Solution" hint="How your product solves it, naming features.">
                <Textarea
                  rows={2}
                  value={bi.draft.messagingSolution?.[i] ?? ""}
                  onChange={(e) => bi.setRow("messagingSolution", i, e.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-1">
                <Field label="Key message" hint="8 to 12 words, headline-ready.">
                  <Input
                    value={keyMessage}
                    onChange={(e) => bi.setRow("messagingKeyMessage", i, e.target.value)}
                  />
                </Field>
                {words > 0 && (
                  <span className={cn("self-end text-xs", words > 12 ? "text-danger" : "text-dim")}>
                    {words} {words === 1 ? "word" : "words"}
                  </span>
                )}
              </div>
            </SegmentCard>
          );
        })
      )}
    </StepShell>
  );
}
