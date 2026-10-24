"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { splitSegment, stepFor } from "@/components/agency/business-info-config";
import { AiHelper } from "@/components/agency/business-info/ai-helper";
import {
  FieldHead,
  FrameCard,
  StepShell,
} from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";

const STEP = stepFor("messaging")!;
const PROMPT = STEP.prompts![0]!;

const KEYS = [
  { key: "messagingProblem", initial: 3 },
  { key: "messagingSolution", initial: 3 },
  { key: "messagingKeyMessage", initial: 3 },
];

const wordCount = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

export function StepMessaging() {
  const bi = useBusinessInfo(KEYS);

  // One card per saved segment, titled with its "who" half.
  const titles = (bi.values.segments ?? [])
    .map((row) => splitSegment(row).who)
    .filter(Boolean);
  const blocks = Math.max(3, titles.length);

  return (
    <StepShell
      stepKey="messaging"
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
        Array.from({ length: blocks }, (_, i) => {
          const keyMessage = bi.draft.messagingKeyMessage?.[i] ?? "";
          const words = wordCount(keyMessage);
          return (
            <FrameCard key={i} innerClassName="flex flex-col gap-5">
              <h2 className="flex items-center gap-3 text-[20px] font-semibold">
                <span className="bg-foreground/5 flex size-8 items-center justify-center rounded-full font-mono text-[13px] font-medium">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {titles[i] ?? `Segment ${i + 1}`}
              </h2>
              <div className="flex flex-col gap-2">
                <FieldHead
                  htmlFor={`p${i}`}
                  label="Problem"
                  hint="The key pain point this segment experiences."
                />
                <Textarea
                  id={`p${i}`}
                  rows={2}
                  value={bi.draft.messagingProblem?.[i] ?? ""}
                  className="px-4 py-3.5 text-[17px] leading-relaxed"
                  onChange={(e) => bi.setRow("messagingProblem", i, e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldHead
                  htmlFor={`s${i}`}
                  label="Solution"
                  hint="How your product solves it, naming features."
                />
                <Textarea
                  id={`s${i}`}
                  rows={2}
                  value={bi.draft.messagingSolution?.[i] ?? ""}
                  className="px-4 py-3.5 text-[17px] leading-relaxed"
                  onChange={(e) => bi.setRow("messagingSolution", i, e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldHead
                  htmlFor={`k${i}`}
                  label="Key message"
                  hint="8 to 12 words, headline-ready."
                />
                <Input
                  id={`k${i}`}
                  value={keyMessage}
                  className="h-auto px-4 py-3.5 text-[17px]"
                  onChange={(e) =>
                    bi.setRow("messagingKeyMessage", i, e.target.value)
                  }
                />
                {words > 0 && (
                  <span
                    className={cn(
                      "self-end font-mono text-[13px]",
                      words > 12 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {words} {words === 1 ? "word" : "words"}
                  </span>
                )}
              </div>
            </FrameCard>
          );
        })
      )}
    </StepShell>
  );
}
