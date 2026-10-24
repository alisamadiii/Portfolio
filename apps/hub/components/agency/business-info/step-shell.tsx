"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import {
  BUSINESS_STEPS,
  sectionUrl,
  stepFor,
} from "@/components/agency/business-info-config";
import { stepStatuses } from "@/components/agency/business-info/status";
import { useAgency } from "@/components/agency/use-agency";
import { ArrowLeft, ArrowRight, Check } from "@/components/icon";

/** Nested-frame card: tinted 6px outer frame, paper inner. */
export function FrameCard({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-foreground/3 ring-foreground/4 rounded-[18px] p-1.5 ring-1",
        className
      )}
    >
      <div
        className={cn(
          "bg-card rounded-[14px] p-7 shadow-[0_6px_16px_rgba(27,26,23,0.05)]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground font-mono text-[13px] tracking-[0.12em] uppercase",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Label + one-line hint above an input, handoff sizes. */
export function FieldHead({
  label,
  hint,
  optional,
  htmlFor,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[16px] font-semibold">
        {label}
        {optional && (
          <span className="text-muted-foreground font-normal"> · optional</span>
        )}
      </label>
      {hint && (
        <span className="text-muted-foreground text-[15px]">{hint}</span>
      )}
    </div>
  );
}

/** Horizontal step pill bar with live done states. */
function StepBar({ currentKey }: { currentKey: string }) {
  const trpc = useTRPC();
  const { repoId } = useAgency();
  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ repoId }));
  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ repoId })
  );
  const statuses = stepStatuses(info.data ?? {}, campaigns.data ?? []);

  return (
    <nav aria-label="Setup steps" className="flex flex-wrap items-center gap-2">
      {BUSINESS_STEPS.map((step) => {
        const current = step.key === currentKey;
        const done = statuses.get(step.step)?.state === "done" && !current;
        return (
          <span key={step.key} className="contents">
            {/* Divider between Part 1 and Part 2. */}
            {step.step === 6 && (
              <span aria-hidden className="bg-foreground/16 h-px w-4" />
            )}
            <Link
              href={sectionUrl(step.key)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full py-2 pr-3.5 pl-2 text-[15px] font-medium",
                current
                  ? "bg-foreground text-background"
                  : "ring-foreground/16 text-muted-foreground hover:text-foreground ring-1 ring-inset"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full font-mono text-[12px]",
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-[#e6efe4] text-[#2f6b3f]"
                      : "bg-foreground/5"
                )}
              >
                {done ? <Check className="size-3.5" /> : step.step}
              </span>
              {step.shortLabel}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

function savedLabel(savedAt: Date): string {
  const minutes = Math.floor((Date.now() - savedAt.getTime()) / 60000);
  if (minutes < 1) return "Saved just now";
  return `Saved ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
}

/**
 * Shared shell for the seven step pages: back link, step bar, header,
 * form + helper columns, footer with save actions.
 */
export function StepShell({
  stepKey,
  headerAside,
  aside,
  footer,
  children,
}: {
  stepKey: string;
  /** Rendered on the header's right (step 7's keyword group select). */
  headerAside?: React.ReactNode;
  aside: React.ReactNode;
  /** Omitted = navigation-only footer (no save actions). */
  footer?: {
    dirty: boolean;
    saving: boolean;
    savedAt: Date | null;
    /** Save, then navigate (undefined target = stay). */
    saveAnd: (to?: string) => void;
  };
  children: React.ReactNode;
}) {
  const step = stepFor(stepKey)!;
  const index = BUSINESS_STEPS.findIndex((s) => s.key === stepKey);
  const prev = BUSINESS_STEPS[index - 1];
  const next = BUSINESS_STEPS[index + 1];
  const last = !next;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-9">
      <div className="flex flex-col gap-5">
        <Link
          href="/business-info"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 self-start text-[15px] font-medium"
        >
          <ArrowLeft className="size-4" /> Business info overview
        </Link>
        <StepBar currentKey={stepKey} />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-[680px] flex-col gap-3">
          <Eyebrow>
            Step {step.step} of {BUSINESS_STEPS.length} · {step.part}
          </Eyebrow>
          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.03em]">
            {step.title}
          </h1>
          <p className="text-muted-foreground text-[19px] leading-relaxed">
            {step.lead}
          </p>
        </div>
        {headerAside}
      </header>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          {children}

          <div className="border-foreground/7 flex flex-wrap items-center justify-between gap-4 border-t pt-3">
            {prev ? (
              <Link
                href={sectionUrl(prev.key)}
                className="hover:text-foreground inline-flex items-center gap-2 py-3 text-[16px] font-medium"
              >
                <ArrowLeft className="size-4" /> {prev.title}
              </Link>
            ) : footer?.savedAt ? (
              <span className="inline-flex items-center gap-2 text-[15px] text-[#2f6b3f]">
                <Check className="size-4" /> {savedLabel(footer.savedAt)}
              </span>
            ) : (
              <span />
            )}
            {footer ? (
              <div className="flex flex-wrap items-center gap-3">
                {prev && footer.savedAt && (
                  <span className="mr-1 inline-flex items-center gap-2 text-[15px] text-[#2f6b3f]">
                    <Check className="size-4" /> {savedLabel(footer.savedAt)}
                  </span>
                )}
                <button
                  type="button"
                  disabled={footer.saving}
                  onClick={() => footer.saveAnd("/business-info")}
                  className="bg-foreground/5 hover:bg-foreground/8 rounded-[11px] px-5 py-3.5 text-[16px] font-medium disabled:opacity-60"
                >
                  Save and exit
                </button>
                <button
                  type="button"
                  disabled={footer.saving}
                  onClick={() =>
                    footer.saveAnd(
                      last ? "/business-info" : sectionUrl(next.key)
                    )
                  }
                  className="bg-primary text-primary-foreground inline-flex items-center gap-2.5 rounded-[11px] px-5.5 py-3.5 text-[16px] font-semibold shadow-[0_8px_24px_rgba(252,132,100,0.32)] disabled:opacity-60"
                >
                  {footer.saving
                    ? "Saving…"
                    : last
                      ? "Save ad text"
                      : "Save and continue"}
                  {!footer.saving &&
                    (last ? (
                      <Check className="size-4.5" />
                    ) : (
                      <ArrowRight className="size-4.5" />
                    ))}
                </button>
              </div>
            ) : next ? (
              <Link
                href={sectionUrl(next.key)}
                className="bg-primary text-primary-foreground inline-flex items-center gap-2.5 rounded-[11px] px-5.5 py-3.5 text-[16px] font-semibold shadow-[0_8px_24px_rgba(252,132,100,0.32)]"
              >
                Continue to {next.title.toLowerCase()}{" "}
                <ArrowRight className="size-4.5" />
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          {aside}
        </aside>
      </div>
    </div>
  );
}
