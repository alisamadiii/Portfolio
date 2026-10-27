"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import {
  BUSINESS_STEPS,
  sectionUrl,
  type BusinessStep,
} from "@/components/agency/business-info-config";
import {
  doneCount,
  nextStep,
  stepStatuses,
  type StepStatus,
} from "@/components/agency/business-info/status";
import { Eyebrow, FrameCard } from "@/components/agency/business-info/step-shell";
import { useRouteRepoId } from "@/hooks/use-repo";
import { useAgency } from "@/components/agency/use-agency";
import { ArrowRight, Check, ChevronRight } from "@/components/icon";

const BADGE_TONES: Record<StepStatus["tone"], string> = {
  success: "bg-[#e6efe4] text-[#2f6b3f]",
  accent: "bg-primary/16 text-[#c2451f]",
  info: "bg-[#e4edf1] text-[#2d5e7a]",
  neutral: "bg-foreground/5 text-muted-foreground",
};

function StatusCircle({ step, status }: { step: number; status: StepStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-[16px]",
        status.state === "done" && "bg-[#e6efe4] text-[#2f6b3f]",
        status.state === "next" && "bg-primary text-primary-foreground font-medium",
        status.state === "progress" && "bg-[#e4edf1] text-[#2d5e7a]",
        (status.state === "blocked" || status.state === "todo") &&
          "bg-foreground/5 text-muted-foreground"
      )}
    >
      {status.state === "done" ? (
        <Check className="size-5" />
      ) : (
        String(step).padStart(2, "0")
      )}
    </span>
  );
}

function StepRow({
  step,
  status,
  divider,
}: {
  step: BusinessStep;
  status: StepStatus;
  divider: boolean;
}) {
  const repoId = useRouteRepoId();
  return (
    <Link
      href={sectionUrl(repoId, step.key)}
      className={cn(
        "flex items-center gap-5 px-6 py-5.5",
        divider && "border-foreground/7 border-b",
        status.state === "next" && "bg-primary/7"
      )}
    >
      <StatusCircle step={step.step} status={status} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[19px] font-semibold">{step.title}</span>
        <span className="text-muted-foreground text-[16px]">
          {step.rowDescription}
        </span>
      </span>
      <span
        className={cn(
          "hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[13px] tracking-[0.06em] uppercase sm:inline-flex",
          BADGE_TONES[status.tone]
        )}
      >
        {status.state === "done" && <Check className="size-3.5" />}
        {status.badge}
      </span>
      <ChevronRight
        className={cn(
          "size-5 shrink-0",
          status.state === "next" ? "text-foreground" : "text-muted-foreground"
        )}
      />
    </Link>
  );
}

function PartSection({
  eyebrow,
  title,
  subtitle,
  steps,
  statuses,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  steps: BusinessStep[];
  statuses: Map<number, StepStatus>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-muted-foreground text-[17px]">{subtitle}</p>
      </div>
      <div className="bg-card ring-foreground/7 overflow-hidden rounded-[18px] shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
        {steps.map((step, i) => (
          <StepRow
            key={step.key}
            step={step}
            status={statuses.get(step.step)!}
            divider={i < steps.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Answer in your own words",
    note: "Plain and specific beats polished.",
  },
  {
    title: "Stuck? Copy the AI prompt",
    note: "It already holds everything you saved, so ChatGPT gets the full picture.",
  },
  {
    title: "Paste back what you like",
    note: "Keep the best answers. You can edit them anytime.",
  },
];

const ANSWERS_GO = [
  { label: "Website copy", steps: "Steps 1–5" },
  { label: "Google Ads", steps: "Steps 1–7" },
  { label: "Newsletter emails", steps: "Steps 2–5" },
];

export function BusinessInfoOverview() {
  const trpc = useTRPC();
  const { repoId } = useAgency();
  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ repoId }));
  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ repoId })
  );

  if (info.isPending || campaigns.isPending)
    return <Skeleton className="mx-auto h-96 w-full max-w-[1120px] rounded-2xl" />;
  const error = info.error ?? campaigns.error;
  if (error)
    return <p className="text-destructive text-[15px]">{error.message}</p>;

  const statuses = stepStatuses(info.data ?? {}, campaigns.data ?? []);
  const done = doneCount(statuses);
  const total = BUSINESS_STEPS.length;
  const next = nextStep(statuses);
  const remaining = BUSINESS_STEPS.filter(
    (s) => statuses.get(s.step)?.state !== "done"
  ).reduce((n, s) => n + s.minutes, 0);
  const nextStatus = statuses.get(next.step);

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
      <header className="flex flex-col gap-3.5">
        <Eyebrow className="flex items-center gap-2.5">
          <span className="bg-primary size-1.5 rounded-full" />
          Setup
        </Eyebrow>
        <h1 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.03em]">
          Business info
        </h1>
        <p className="text-muted-foreground max-w-[680px] text-[19px] leading-relaxed">
          Seven short sections about your business. Answer them once and we use
          them to write your website copy, your Google Ads and your campaigns.
          Stuck on one? Each section has a ready-made AI prompt that fills
          itself in.
        </p>
      </header>

      <FrameCard innerClassName="flex flex-wrap items-center gap-x-10 gap-y-6 p-7 shadow-[0_14px_34px_rgba(27,26,23,0.06)]">
        <div className="flex min-w-0 flex-[999_1_360px] flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <span className="text-[24px] font-semibold tracking-[-0.02em]">
              {done} of {total} sections done
            </span>
            {remaining > 0 && (
              <span className="text-muted-foreground font-mono text-[14px]">
                About {remaining} min left
              </span>
            )}
          </div>
          <div
            role="img"
            aria-label={`${Math.round((done / total) * 100)} percent complete`}
            className="bg-foreground/8 h-2.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-foreground h-full rounded-full"
              style={{ width: `${Math.max((done / total) * 100, 2)}%` }}
            />
          </div>
          {done < total && (
            <span className="text-muted-foreground text-[16px]">
              Next up:{" "}
              <strong className="text-foreground font-semibold">
                {next.title}
              </strong>
              {nextStatus && nextStatus.unlocks.length > 0 && (
                <>
                  {" "}
                  · it unlocks{" "}
                  {nextStatus.unlocks.length === 1
                    ? `step ${nextStatus.unlocks[0]}`
                    : `steps ${nextStatus.unlocks.join(" and ")}`}
                  .
                </>
              )}
            </span>
          )}
        </div>
        <Link
          href={sectionUrl(repoId, next.key)}
          className="bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-2.5 rounded-[11px] px-6 py-3.5 text-[17px] font-semibold shadow-[0_8px_24px_rgba(252,132,100,0.32)]"
        >
          {done === total ? "Review answers" : "Continue setup"}{" "}
          <ArrowRight className="size-4.5" />
        </Link>
      </FrameCard>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-9">
          <PartSection
            eyebrow="Part 1"
            title="Brand foundation"
            subtitle="Who you are, who you serve, and what you say to them."
            steps={BUSINESS_STEPS.filter((s) => s.part === "Brand foundation")}
            statuses={statuses}
          />
          <PartSection
            eyebrow="Part 2"
            title="Google Ads"
            subtitle="Turn your answers into a search campaign we can launch."
            steps={BUSINESS_STEPS.filter((s) => s.part === "Google Ads")}
            statuses={statuses}
          />
        </div>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <FrameCard innerClassName="flex flex-col gap-5 p-6">
            <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
              How each section works
            </h2>
            <ol className="flex flex-col gap-4.5">
              {HOW_IT_WORKS.map((tip, i) => (
                <li key={i} className="flex gap-3.5">
                  <span className="bg-foreground/5 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[13px]">
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[16px] font-semibold">
                      {tip.title}
                    </span>
                    <span className="text-muted-foreground text-[15px] leading-normal">
                      {tip.note}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </FrameCard>
          <div className="ring-foreground/7 flex flex-col gap-4 rounded-[18px] p-6 ring-1">
            <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
              Where your answers go
            </h2>
            <ul className="flex flex-col gap-3.5 text-[16px]">
              {ANSWERS_GO.map((row) => (
                <li
                  key={row.label}
                  className="flex justify-between gap-3"
                >
                  <span>{row.label}</span>
                  <span className="text-muted-foreground font-mono text-[13px]">
                    {row.steps}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
