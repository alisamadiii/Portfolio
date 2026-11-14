"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronRight } from "lucide-react";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTRPC } from "@workspace/trpc/client";
import { cn } from "@workspace/ui/lib/utils";

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
import { SideNote } from "@/components/ds/business-info/side-cards";
import { WithSide } from "@/components/ds/layout/app-shell";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { ButtonLink } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { Progress } from "@/components/ds/ui/misc";
import { useRouteProjectId } from "@/hooks/use-repo";

const BADGE_TONE: Record<StepStatus["tone"], BadgeTone> = {
  success: "success",
  accent: "coral",
  info: "info",
  neutral: "neutral",
};

function StepRow({ step, status }: { step: BusinessStep; status: StepStatus }) {
  const projectId = useRouteProjectId();
  const next = status.state === "next";
  return (
    <Link
      href={sectionUrl(projectId, step.key)}
      className={cn(
        "flex items-center gap-4 border-b border-divider px-5 py-4 last:border-b-0 hover:bg-sidebar",
        next && "bg-next-row hover:bg-next-row"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
          status.state === "done" && "bg-success-soft text-success-text",
          next && "bg-coral text-ink",
          status.state !== "done" && !next && "bg-tile text-ink-3"
        )}
      >
        {status.state === "done" ? <Check className="size-4" strokeWidth={2.4} /> : step.step}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{step.title}</span>
        <span className="text-[13px] text-dim">{step.rowDescription}</span>
      </span>
      <Badge tone={BADGE_TONE[status.tone]} className="hidden sm:inline-flex">
        {status.badge}
      </Badge>
      <ChevronRight className={cn("size-4 shrink-0", next ? "text-ink" : "text-faint")} />
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
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] text-dim">{eyebrow}</span>
        <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="text-[13px] text-dim">{subtitle}</p>
      </div>
      <Card className="overflow-hidden">
        {steps.map((step) => (
          <StepRow key={step.key} step={step} status={statuses.get(step.step)!} />
        ))}
      </Card>
    </section>
  );
}

const HOW_IT_WORKS = [
  { title: "Answer in your own words", note: "Plain and specific beats polished." },
  {
    title: "Stuck? Copy the AI prompt",
    note: "It already holds everything you saved, so ChatGPT gets the full picture.",
  },
  { title: "Paste back what you like", note: "Keep the best answers. You can edit them anytime." },
];

const ANSWERS_GO = [
  { label: "Website copy", steps: "Steps 1–5" },
  { label: "Google Ads", steps: "Steps 1–7" },
  { label: "Newsletter emails", steps: "Steps 2–5" },
];

export function BusinessInfoOverview() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ projectId }));
  const campaigns = useQuery(trpc.agency.campaigns.list.queryOptions({ projectId }));

  const header = (
    <PageHeader
      title="Business info"
      description="Seven short sections about your business. Answer them once and we use them for your website copy, your Google Ads and your emails. Each section has a ready-made AI prompt if you get stuck."
    />
  );

  if (info.isPending || campaigns.isPending)
    return (
      <>
        {header}
        <Skeleton className="h-96 w-full rounded-card" />
      </>
    );
  const error = info.error ?? campaigns.error;
  if (error)
    return (
      <>
        {header}
        <p className="text-sm text-danger">{error.message}</p>
      </>
    );

  const statuses = stepStatuses(info.data ?? {}, campaigns.data ?? []);
  const done = doneCount(statuses);
  const total = BUSINESS_STEPS.length;
  const next = nextStep(statuses);
  const remaining = BUSINESS_STEPS.filter((s) => statuses.get(s.step)?.state !== "done").reduce(
    (n, s) => n + s.minutes,
    0
  );
  const nextStatus = statuses.get(next.step);

  return (
    <>
      {header}

      <Card className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
        <div className="flex min-w-0 flex-[999_1_360px] flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-base font-semibold">
              {done} of {total} sections done
            </span>
            {remaining > 0 && <span className="text-[13px] text-dim">About {remaining} min left</span>}
          </div>
          <Progress value={(done / total) * 100} />
          {done < total && (
            <span className="text-[13px] text-dim">
              Next up: <strong className="font-semibold text-ink">{next.title}</strong>
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
        <ButtonLink
          variant="primary"
          href={sectionUrl(projectId, next.key)}
          trailingIcon={<ArrowRight className="size-3.5" />}
        >
          {done === total ? "Review answers" : "Continue setup"}
        </ButtonLink>
      </Card>

      <WithSide
        side={
          <>
            <Card className="flex flex-col gap-4 p-5">
              <h2 className="text-[15px] font-semibold">How each section works</h2>
              <ol className="flex flex-col gap-3.5">
                {HOW_IT_WORKS.map((tip, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-tile text-xs font-semibold text-ink-3">
                      {i + 1}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{tip.title}</span>
                      <span className="text-[13px] leading-normal text-dim">{tip.note}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
            <SideNote title="Where your answers go">
              <ul className="flex flex-col">
                {ANSWERS_GO.map((row) => (
                  <li
                    key={row.label}
                    className="flex justify-between gap-3 border-t border-divider py-2.5 text-[13px] first:border-t-0"
                  >
                    <span className="text-ink">{row.label}</span>
                    <span className="text-dim">{row.steps}</span>
                  </li>
                ))}
              </ul>
            </SideNote>
          </>
        }
      >
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
      </WithSide>
    </>
  );
}
