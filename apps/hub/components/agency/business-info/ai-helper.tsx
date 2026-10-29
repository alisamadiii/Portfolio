"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { cn } from "@workspace/ui/lib/utils";

import {
  fillText,
  resolvePrompt,
  sectionUrl,
  stepFor,
  type PromptSpec,
} from "@/components/agency/business-info-config";
import {
  ArrowUpRight,
  Check,
  Copy,
  Lock,
  TriangleAlert,
} from "@/components/icon";
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
 * The dark AI helper panel: inputs checklist, prompt preview, copy + open
 * ChatGPT, and the 3-step mini guide.
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
  const [open, setOpen] = useState(false);
  const { text, missing } = resolvePrompt(prompt, values);
  const { copied, copy } = useCopy(text);
  const complete = missing.length === 0;
  const paragraphs = text.split("\n\n");

  return (
    <div className="flex flex-col gap-5 rounded-[18px] bg-[#1b1a17] p-6 text-[#ece9e2] shadow-[0_24px_60px_rgba(27,26,23,0.22)]">
      <span className="text-primary flex items-center gap-2.5 font-mono text-[13px] tracking-[0.12em] uppercase">
        <span className="bg-primary size-1.5 rounded-full" />
        AI helper
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-[23px] leading-tight font-semibold tracking-[-0.02em]">
          {prompt.helperTitle}
        </h2>
        <p className="text-[16px] leading-relaxed text-[#b8b2a7]">
          {prompt.helperNote}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5 text-[16px]">
        {Object.values(prompt.fills).map((fill) => {
          const present = Boolean(fillText(values, fill));
          const step = stepFor(fill.section);
          return (
            <li key={fill.key} className="flex flex-wrap items-center gap-2.5">
              <span
                aria-hidden
                className={present ? "text-[#7fbf8c]" : "text-[#e7b25a]"}
              >
                {present ? (
                  <Check className="size-4" />
                ) : (
                  <TriangleAlert className="size-4" />
                )}
              </span>
              {fill.label}
              {!present && step && (
                <Link
                  href={links?.[fill.section] ?? sectionUrl(projectId, fill.section)}
                  className="text-primary ml-auto text-[15px]"
                >
                  Add in step {step.step}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 rounded-[11px] bg-[#0b0a09] p-4.5 ring-1 ring-[#ece9e2]/9 ring-inset">
        {(open ? paragraphs : paragraphs.slice(0, 2)).map((paragraph, i) => (
          <p
            key={i}
            className={cn(
              "text-[15px] leading-relaxed whitespace-pre-wrap",
              !open && i === 1 ? "text-[#a39d92]" : "text-[#e8e4dc]"
            )}
          >
            {paragraph}
          </p>
        ))}
        <button
          type="button"
          className="text-primary self-start text-[15px] font-medium underline underline-offset-3"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide full prompt" : "Show full prompt"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={copy}
          className={cn(
            "inline-flex flex-[1_1_140px] items-center justify-center gap-2 rounded-[11px] px-4.5 py-3.5 text-[16px] font-semibold",
            complete
              ? "bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(252,132,100,0.28)]"
              : "bg-[#ece9e2]/10 font-medium text-[#ece9e2]"
          )}
        >
          {copied ? (
            <Check className="size-4.5" />
          ) : (
            <Copy className="size-4.5" />
          )}
          {copied ? "Copied" : complete ? "Copy prompt" : "Copy prompt anyway"}
        </button>
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-[1_1_140px] items-center justify-center gap-2 rounded-[11px] bg-[#ece9e2]/8 px-4.5 py-3.5 text-[16px] font-medium text-[#ece9e2]"
        >
          Open ChatGPT <ArrowUpRight className="size-4.5" />
        </a>
      </div>

      <ol className="flex flex-col gap-2.5 border-t border-[#ece9e2]/9 pt-4 text-[15px] text-[#b8b2a7]">
        <li className="flex gap-3">
          <span className="font-mono text-[#ece9e2]">1</span>Copy the prompt
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-[#ece9e2]">2</span>Paste it into
          ChatGPT
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-[#ece9e2]">3</span>
          {prompt.guideReturn}
        </li>
      </ol>
    </div>
  );
}

/**
 * Step 2's second prompt: locked light card until a segment exists, then a
 * light card with its own copy button.
 */
export function VerifyCard({
  prompt,
  values,
}: {
  prompt: PromptSpec;
  values: Record<string, string[]>;
}) {
  const projectId = useRouteProjectId();
  const [open, setOpen] = useState(false);
  const { text, missing } = resolvePrompt(prompt, values);
  const { copied, copy } = useCopy(text);
  const locked = missing.length > 0;

  if (locked)
    return (
      <div className="ring-foreground/7 flex items-start gap-4 rounded-[18px] p-5.5 ring-1">
        <span
          aria-hidden
          className="bg-foreground/5 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full"
        >
          <Lock className="size-4.5" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[17px] font-semibold">
            {prompt.helperTitle}
          </span>
          <span className="text-muted-foreground text-[15px] leading-normal">
            {prompt.helperNote} Unlocks once you add a segment.
          </span>
        </div>
      </div>
    );

  return (
    <div className="ring-foreground/7 flex flex-col gap-4 rounded-[18px] p-5.5 ring-1">
      <div className="flex flex-col gap-1">
        <span className="text-[17px] font-semibold">{prompt.helperTitle}</span>
        <span className="text-muted-foreground text-[15px] leading-normal">
          {prompt.helperNote}
        </span>
      </div>
      {open && (
        <p className="bg-foreground/3 text-muted-foreground rounded-[11px] p-4 text-[14px] leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="bg-foreground/5 hover:bg-foreground/8 inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[15px] font-medium"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy prompt"}
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-[15px] font-medium underline underline-offset-3"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide prompt" : "Show prompt"}
        </button>
      </div>
    </div>
  );
}
