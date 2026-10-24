"use client";

import { useEffect, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  joinSegment,
  splitSegment,
  stepFor,
  type SegmentParts,
} from "@/components/agency/business-info-config";
import { AiHelper, VerifyCard } from "@/components/agency/business-info/ai-helper";
import {
  FieldHead,
  FrameCard,
  StepShell,
} from "@/components/agency/business-info/step-shell";
import { useBusinessInfo } from "@/components/agency/business-info/use-business-info";
import { Plus, Trash } from "@/components/icon";

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
      footer={{
        dirty: bi.dirty,
        saving: bi.saving,
        savedAt: bi.savedAt,
        saveAnd: bi.saveAnd,
      }}
      aside={
        <>
          <AiHelper prompt={IDENTIFY!} values={bi.values} />
          <VerifyCard prompt={VERIFY!} values={bi.values} />
        </>
      }
    >
      {bi.info.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : (
        <>
          {pairs.map((pair, i) => (
            <FrameCard key={i} innerClassName="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-3 text-[20px] font-semibold">
                  <span className="bg-foreground/5 flex size-8 items-center justify-center rounded-full font-mono text-[13px] font-medium">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  Segment {i + 1}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove segment ${i + 1}`}
                  className="size-11"
                  disabled={pairs.length <= 1}
                  onClick={() => removePair(i)}
                >
                  <Trash className="size-4.5" />
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <FieldHead htmlFor={`s${i}who`} label="Who they are" />
                <Input
                  id={`s${i}who`}
                  value={pair.who}
                  placeholder={
                    i === 0
                      ? "e.g. Pest control owners in Jacksonville with 2–10 trucks"
                      : "Who is this group?"
                  }
                  className="h-auto px-4 py-3.5 text-[17px]"
                  onChange={(e) => setPair(i, { who: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldHead
                  htmlFor={`s${i}why`}
                  label="Why they're a strong match"
                />
                <Textarea
                  id={`s${i}why`}
                  rows={3}
                  value={pair.why}
                  placeholder="What do they need that you're especially good at?"
                  className="px-4 py-3.5 text-[17px] leading-relaxed"
                  onChange={(e) => setPair(i, { why: e.target.value })}
                />
              </div>
            </FrameCard>
          ))}
          <Button
            variant="ghost"
            className="bg-foreground/5 hover:bg-foreground/8 self-start rounded-[11px] px-4.5 py-3 text-[16px]"
            onClick={addPair}
          >
            <Plus className="size-4" /> Add another segment
          </Button>
        </>
      )}
    </StepShell>
  );
}
