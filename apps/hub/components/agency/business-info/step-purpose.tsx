"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  Eyebrow,
  FieldHead,
  FrameCard,
  StepShell,
} from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { Check, X } from "@/components/icon";

const QUESTIONS: { label: string; hint: string }[] = [
  {
    label: "Why do you do what you do?",
    hint: "The reason behind the business, beyond money.",
  },
  {
    label: "Who do you want to help?",
    hint: "The people you most want as customers.",
  },
  {
    label: "What can you help with?",
    hint: "The problems you actually solve for them.",
  },
  {
    label: "Would your audience like that?",
    hint: "Be honest: does your answer above match what they want?",
  },
  {
    label: "What does your audience actually like?",
    hint: "What they praise, ask for, and come back for.",
  },
];

export function StepPurpose() {
  const bi = useBusinessInfo([{ key: "purpose", initial: 5 }]);

  return (
    <StepShell
      stepKey="purpose"
      footer={{
        dirty: bi.dirty,
        saving: bi.saving,
        savedAt: bi.savedAt,
        saveAnd: bi.saveAnd,
      }}
      aside={
        <div className="bg-foreground/3 ring-foreground/7 flex flex-col gap-4 rounded-[18px] p-6 ring-1">
          <Eyebrow>Tip</Eyebrow>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
            Honest beats impressive
          </h2>
          <div className="flex flex-col gap-1.5 rounded-[11px] bg-[#f8e6e7] p-4">
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tracking-[0.08em] text-[#a3283a] uppercase">
              <X className="size-3.5" /> Too vague
            </span>
            <span className="text-foreground text-[16px] leading-normal">
              "We're passionate about excellence and innovation."
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[11px] bg-[#e6efe4] p-4">
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tracking-[0.08em] text-[#2f6b3f] uppercase">
              <Check className="size-3.5" /> Clear
            </span>
            <span className="text-foreground text-[16px] leading-normal">
              "I watched good local businesses lose jobs to worse ones with
              better marketing. I fix that."
            </span>
          </div>
        </div>
      }
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : (
        <FrameCard innerClassName="flex flex-col gap-7 p-8">
          {QUESTIONS.map((question, i) => (
            <div key={i} className="flex flex-col gap-2">
              <FieldHead
                htmlFor={`q${i}`}
                label={question.label}
                hint={question.hint}
              />
              <Textarea
                id={`q${i}`}
                rows={2}
                value={bi.draft.purpose?.[i] ?? ""}
                className="px-4 py-3.5 text-[17px] leading-relaxed"
                onChange={(e) => bi.setRow("purpose", i, e.target.value)}
              />
            </div>
          ))}
        </FrameCard>
      )}
    </StepShell>
  );
}
