"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { StepShell } from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { TipCard } from "@/components/ds/business-info/side-cards";
import { Card } from "@/components/ds/ui/card";
import { Field, Textarea } from "@/components/ds/ui/field";

const QUESTIONS: { label: string; hint: string }[] = [
  { label: "Why do you do what you do?", hint: "The reason behind the business, beyond money." },
  { label: "Who do you want to help?", hint: "The people you most want as customers." },
  { label: "What can you help with?", hint: "The problems you actually solve for them." },
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
      footer={{ dirty: bi.dirty, saving: bi.saving, savedAt: bi.savedAt, saveAnd: bi.saveAnd }}
      aside={
        <TipCard
          title="Honest beats impressive"
          bad="We're passionate about excellence and innovation."
          good="I watched good local businesses lose jobs to worse ones with better marketing. I fix that."
        />
      }
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : (
        <Card className="flex flex-col gap-6 p-6">
          {QUESTIONS.map((question, i) => (
            <Field key={i} label={question.label} hint={question.hint}>
              <Textarea
                rows={2}
                value={bi.draft.purpose?.[i] ?? ""}
                onChange={(e) => bi.setRow("purpose", i, e.target.value)}
              />
            </Field>
          ))}
        </Card>
      )}
    </StepShell>
  );
}
