"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronLeft, Plus, Trash2, X } from "lucide-react";

import { Button, IconButton } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/field";

/** Numbered single-line list (features, taglines). 01, 02 … with remove buttons and an "Add …" subtle button. */
export function NumberedList({
  values,
  placeholder,
  addLabel,
  onChange,
  disabled,
}: {
  values: string[];
  placeholder: string;
  addLabel: string;
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-[22px] text-xs tabular-nums text-faint">{String(i + 1).padStart(2, "0")}</span>
          <Input
            value={v}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <IconButton
            aria-label={`Remove line ${i + 1}`}
            className="size-8 shrink-0"
            disabled={disabled}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
          >
            <X className="size-4" />
          </IconButton>
        </div>
      ))}
      <div className="pl-8">
        <Button
          variant="subtle"
          size="sm"
          icon={<Plus className="size-3.5" />}
          disabled={disabled}
          onClick={() => onChange([...values, ""])}
        >
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

/** "Segment 1" card used in steps 2 and 3. */
export function SegmentCard({
  index,
  title,
  onDelete,
  children,
}: {
  index: number;
  title?: string;
  onDelete?: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 px-6 pb-6 pt-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="flex size-6 items-center justify-center rounded-full bg-tile text-xs font-semibold text-ink-3">
            {index}
          </span>
          {title ?? `Segment ${index}`}
        </span>
        {onDelete && (
          <IconButton aria-label={`Delete segment ${index}`} className="size-8" onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
      {children}
    </Card>
  );
}

/** Footer under every step: back link left, "Save and exit" + coral "Save and continue →" right. */
export function StepFooter({
  backHref,
  backLabel,
  nextLabel = "Save and continue",
  onSaveExit,
  onNext,
  saving,
  readOnly,
}: {
  backHref: string;
  backLabel: string;
  nextLabel?: string;
  onSaveExit: () => void;
  onNext: () => void;
  saving?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <Link href={backHref} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
        <ChevronLeft className="size-3.5" />
        {backLabel}
      </Link>
      {!readOnly && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSaveExit} disabled={saving}>
            Save and exit
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            disabled={saving}
            trailingIcon={<ArrowRight className="size-3.5" />}
          >
            {nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
