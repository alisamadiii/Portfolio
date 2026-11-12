"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ExternalLink, Lock, Sparkles, X } from "lucide-react";

import { Button, buttonClass } from "../ui/button";
import { Card } from "../ui/card";

/** Light AI helper card (replaces the old black panel). */
export function AiHelper({
  title,
  description,
  missing = [],
  prompt,
  lastStep,
  stepHref,
}: {
  title: string;
  description: string;
  /** Answers the prompt needs that are still empty. */
  missing?: { label: string; step: number }[];
  /** Full prompt with the user's answers already substituted. */
  prompt: string;
  /** Third instruction line, e.g. "Bring the best three back here". */
  lastStep: string;
  stepHref: (step: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-deep">
        <Sparkles className="size-3.5" />
        AI helper
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-[13px] leading-normal text-dim">{description}</p>
      </div>
      {missing.length > 0 && (
        <div className="flex flex-col gap-2 rounded-inner bg-warning-soft px-3 py-2.5">
          <span className="text-xs text-dim">Fill these in first for a better prompt</span>
          {missing.map((m) => (
            <div key={`${m.step}-${m.label}`} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="size-1.5 rounded-full bg-warning" />
                {m.label}
              </span>
              <Link href={stepHref(m.step)} className="text-xs font-medium text-coral-text">
                Add in step {m.step}
              </Link>
            </div>
          ))}
        </div>
      )}
      <div
        className={`whitespace-pre-line rounded-inner border border-divider bg-canvas px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2 ${expanded ? "" : "line-clamp-6"}`}
      >
        {prompt}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="-mt-1.5 self-start text-[13px] font-medium text-coral-text"
      >
        {expanded ? "Show less" : "Show full prompt"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="dark"
          size="sm"
          onClick={copy}
          icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        >
          {copied ? "Copied" : "Copy prompt"}
        </Button>
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noreferrer"
          className={buttonClass("outline", "sm")}
        >
          Open ChatGPT
          <ExternalLink className="size-3" />
        </a>
      </div>
      <ol className="flex list-decimal flex-col gap-1 border-t border-divider pl-[18px] pt-3 text-[12.5px] leading-normal text-ink-3">
        <li>Copy the prompt</li>
        <li>Paste it into ChatGPT</li>
        <li>{lastStep}</li>
      </ol>
    </Card>
  );
}

/** "Too vague / Clear" example pair. */
export function TipCard({ title, bad, good }: { title: string; bad: string; good: string }) {
  return (
    <Card soft className="flex flex-col gap-3 p-5">
      <span className="text-xs font-medium text-dim">Tip</span>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="flex flex-col gap-1 rounded-inner bg-danger-soft px-3.5 py-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <X className="size-3" strokeWidth={2.6} />
          Too vague
        </span>
        <span className="text-[13px] leading-normal text-ink-2">&ldquo;{bad}&rdquo;</span>
      </div>
      <div className="flex flex-col gap-1 rounded-inner bg-success-tint px-3.5 py-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-success-text">
          <Check className="size-3" strokeWidth={2.6} />
          Clear
        </span>
        <span className="text-[13px] leading-normal text-ink-2">&ldquo;{good}&rdquo;</span>
      </div>
    </Card>
  );
}

export function UsedIn({ items }: { items: string[] }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-[15px] font-semibold">This answer is used in</h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((t) => (
          <li key={t} className="flex items-center gap-2 text-[13px] text-ink-3">
            <Sparkles className="size-3.5 text-coral-deep" />
            {t}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function LockedNext({ title, text }: { title: string; text: string }) {
  return (
    <Card soft className="flex gap-3 px-5 py-4">
      <Lock className="mt-0.5 size-4 shrink-0 text-faint" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[13px] leading-normal text-dim">{text}</span>
      </span>
    </Card>
  );
}

/** Soft side card with a title and free content (e.g. "Where your answers go"). */
export function SideNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card soft className="flex flex-col gap-3 p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
