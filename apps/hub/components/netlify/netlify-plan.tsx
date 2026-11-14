"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Progress } from "@/components/ds/ui/misc";
import { useRouteProjectId } from "@/hooks/use-repo";

type Usage = { used: number | null; included: number | null } | null;

const fraction = (u: Usage, unit = "") =>
  u && u.used != null
    ? `${u.used.toLocaleString()}${u.included != null ? ` / ${u.included.toLocaleString()}` : ""}${unit}`
    : "—";

/**
 * The client's Netlify team: plan and usage. Not shown for sites on
 * the agency's Netlify.
 */
export function NetlifyPlan() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const account = useQuery(trpc.netlify.account.queryOptions({ projectId }, { retry: false }));

  if (account.isPending) return <Skeleton className="h-[260px] rounded-card" />;
  if (account.isError || !account.data) return null;
  const a = account.data;
  const minutes = a.buildMinutes;
  const minutesPct =
    minutes?.used != null && minutes.included ? (minutes.used / minutes.included) * 100 : null;

  const rows: [string, React.ReactNode][] = [
    ["Plan", a.plan ?? "—"],
    ["Team", a.team],
    ["Members", fraction(a.members)],
    [
      "Build minutes",
      <span key="m" className="flex w-full max-w-[260px] flex-col items-end gap-1.5">
        <span>{fraction(minutes, " min")}</span>
        {minutesPct != null && <Progress value={minutesPct} className="w-full" />}
        {minutes?.periodEnd && (
          <span className="text-[12px] text-dim">Resets {format(parseISO(minutes.periodEnd), "MMM d")}</span>
        )}
      </span>,
    ],
    ["Auto top-up", a.autoTopUp == null ? "—" : a.autoTopUp ? "On" : "Off"],
    ["Next bill", a.nextBillingAt ? format(parseISO(a.nextBillingAt), "MMM d, yyyy") : "—"],
  ];

  return (
    <Card>
      {a.overLimit && (
        <p className="border-b border-divider bg-coral-soft px-6 py-3 text-[13px] text-coral-deep">
          This Netlify team is over its usage limit. Builds or the site may be paused until you add credits.
        </p>
      )}
      <CardHeader
        title="Plan & usage"
        divided
        action={
          <div className="flex gap-2">
            <ButtonAnchor size="sm" href={a.usageUrl} target="_blank" rel="noreferrer" icon={<ExternalLink className="size-3.5" />}>
              View usage in Netlify
            </ButtonAnchor>
            <ButtonAnchor size="sm" href={a.billingUrl} target="_blank" rel="noreferrer">
              Manage billing
            </ButtonAnchor>
          </div>
        }
      />
      <dl className="flex flex-col divide-y divide-divider text-[14px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-6 py-3">
            <dt className="text-dim">{label}</dt>
            <dd className="text-right text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
