"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Skeleton } from "@workspace/ui/components/skeleton";

import {
  joinSegment,
  splitSegment,
  stepFor,
  type SegmentParts,
} from "@/components/agency/business-info-config";
import { AiHelper, VerifyCard } from "@/components/agency/business-info/ai-helper";
import { StepShell } from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { SegmentCard } from "@/components/ds/business-info/form-parts";
import { LockedNext } from "@/components/ds/business-info/side-cards";
import { Button } from "@/components/ds/ui/button";
import { Field, Input, Textarea } from "@/components/ds/ui/field";

const STEP = stepFor("segments")!;
const [IDENTIFY, VERIFY] = STEP.prompts!;

export function StepSegments() {
  const bi = useBusinessInfo([{ key: "segments", initial: 3 }]);

  // Storage stays one string per segment ("who — why"); the UI edits the two
  // halves. Local pairs are the editing source; every change writes the
  // joined string back into the draft (which prompts and save read).
  const [pairs, setPairs] = useState<SegmentParts[]>([]);
  useEffect(() => {
    if (!bi.info.data) return;
    const rows = bi.info.data.segments ?? [];
    const seeded = rows.map(splitSegment);
    while (seeded.length < 3) seeded.push({ who: "", why: "" });
    setPairs(seeded);
  }, [bi.info.data]);

  const setPair = (i: number, patch: Partial<SegmentParts>) => {
    setPairs((prev) => {
      const next = prev.map((p, j) => (j === i ? { ...p, ...patch } : p));
      bi.setRow("segments", i, joinSegment(next[i]!));
      return next;
    });
  };
  const addPair = () => {
    setPairs((prev) => [...prev, { who: "", why: "" }]);
    bi.addRow("segments");
  };
  const removePair = (i: number) => {
    setPairs((prev) => prev.filter((_, j) => j !== i));
    bi.removeRow("segments", i);
  };

  return (
    <StepShell
      stepKey="segments"
      footer={{ dirty: bi.dirty, saving: bi.saving, savedAt: bi.savedAt, saveAnd: bi.saveAnd }}
      aside={
        <>
          <AiHelper prompt={IDENTIFY!} values={bi.values} />
          <VerifyCard prompt={VERIFY!} values={bi.values} />
          <LockedNext
            title="Then: check them against competitors"
            text="Once your segments are in, the next prompt compares them with what competitors target."
          />
        </>
      }
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : (
        <>
          {pairs.map((pair, i) => (
            <SegmentCard key={i} index={i + 1} onDelete={pairs.length > 1 ? () => removePair(i) : undefined}>
              <Field label="Who they are">
                <Input
                  value={pair.who}
                  placeholder={
                    i === 0
                      ? "e.g. Pest control owners in Jacksonville with 2–10 trucks"
                      : "Who is this group?"
                  }
                  onChange={(e) => setPair(i, { who: e.target.value })}
                />
              </Field>
              <Field label="Why they're a strong match">
                <Textarea
                  rows={3}
                  value={pair.why}
                  placeholder="What do they need that you're especially good at?"
                  onChange={(e) => setPair(i, { why: e.target.value })}
                />
              </Field>
            </SegmentCard>
          ))}
          <Button variant="subtle" size="sm" className="self-start" icon={<Plus className="size-3.5" />} onClick={addPair}>
            Add another segment
          </Button>
        </>
      )}
    </StepShell>
  );
}
