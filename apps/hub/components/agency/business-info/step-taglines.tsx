"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { stepFor } from "@/components/agency/business-info-config";
import { AiHelper } from "@/components/agency/business-info/ai-helper";
import { StepShell } from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { NumberedList } from "@/components/ds/business-info/form-parts";
import { Card } from "@/components/ds/ui/card";

const STEP = stepFor("taglines")!;
const PROMPT = STEP.prompts![0]!;

export function StepTaglines() {
  const bi = useBusinessInfo([{ key: "taglines", initial: 5 }]);
  const rows = bi.draft.taglines ?? [];

  return (
    <StepShell
      stepKey="taglines"
      footer={{ dirty: bi.dirty, saving: bi.saving, savedAt: bi.savedAt, saveAnd: bi.saveAnd }}
      aside={<AiHelper prompt={PROMPT} values={bi.values} />}
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : (
        <Card className="p-6">
          <NumberedList
            values={rows}
            placeholder="e.g. Fast, friendly, done right."
            addLabel="Add tagline"
            onChange={(next) => bi.setDraft({ ...bi.draft, taglines: next })}
          />
        </Card>
      )}
    </StepShell>
  );
}
