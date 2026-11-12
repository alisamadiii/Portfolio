"use client";

import { useState } from "react";
import { Check, Copy, Lock } from "lucide-react";
import { toast } from "sonner";

import {
  fillText,
  resolvePrompt,
  sectionUrl,
  stepFor,
  type PromptSpec,
} from "@/components/agency/business-info-config";
import { AiHelper as DsAiHelper } from "@/components/ds/business-info/side-cards";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { useRouteProjectId } from "@/hooks/use-repo";

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Couldn't copy the prompt."));
  };
  return { copied, copy };
}

/**
 * Light AI helper card: which saved answers the prompt still needs, the
 * prompt itself (already filled in), copy + open ChatGPT, 3-step guide.
 */
export function AiHelper({
  prompt,
  values,
  links,
}: {
  prompt: PromptSpec;
  values: Record<string, string[]>;
  /** Per-section href overrides (e.g. deep-link to the selected category). */
  links?: Record<string, string>;
}) {
  const projectId = useRouteProjectId();
  const { text } = resolvePrompt(prompt, values);
  const missing = Object.values(prompt.fills)
    .filter((fill) => !fillText(values, fill))
    .map((fill) => ({ label: fill.label, step: stepFor(fill.section)?.step ?? 0, section: fill.section }))
    .filter((m) => m.step > 0);
  const hrefFor = (step: number) => {
    const m = missing.find((x) => x.step === step);
    const section = m?.section ?? BUSINESS_STEP_KEY_BY_NUMBER[step] ?? "";
    return links?.[section] ?? sectionUrl(projectId, section);
  };
  return (
    <DsAiHelper
      title={prompt.helperTitle}
      description={prompt.helperNote}
      missing={missing.map(({ label, step }) => ({ label, step }))}
      prompt={text}
      lastStep={prompt.guideReturn}
      stepHref={hrefFor}
    />
  );
}

const BUSINESS_STEP_KEY_BY_NUMBER: Record<number, string> = {
  1: "business",
  2: "segments",
  3: "messaging",
  4: "taglines",
  5: "purpose",
  6: "keywords",
  7: "search-ad",
};

/**
 * Step 2's second prompt: locked soft card until a segment exists, then a
 * light card with its own copy button.
 */
export function VerifyCard({
  prompt,
  values,
}: {
  prompt: PromptSpec;
  values: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const { text, missing } = resolvePrompt(prompt, values);
  const { copied, copy } = useCopy(text);
  const locked = missing.length > 0;

  if (locked)
    return (
      <Card soft className="flex gap-3 px-5 py-4">
        <Lock className="mt-0.5 size-4 shrink-0 text-faint" />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{prompt.helperTitle}</span>
          <span className="text-[13px] leading-normal text-dim">
            {prompt.helperNote} Unlocks once you add a segment.
          </span>
        </span>
      </Card>
    );

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{prompt.helperTitle}</span>
        <span className="text-[13px] leading-normal text-dim">{prompt.helperNote}</span>
      </div>
      {open && (
        <p className="whitespace-pre-wrap rounded-inner border border-divider bg-canvas px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
          {text}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="dark"
          size="sm"
          onClick={copy}
          icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        >
          {copied ? "Copied" : "Copy prompt"}
        </Button>
        <button
          type="button"
          className="text-[13px] font-medium text-coral-text"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide prompt" : "Show prompt"}
        </button>
      </div>
    </Card>
  );
}
