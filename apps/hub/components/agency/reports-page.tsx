"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { HoverInfo } from "@/components/agency/hover-info";
import { formatMoney } from "@/components/agency/lead-status";
import { PageShell, TableCard } from "@/components/agency/page-shell";
import { useAgency } from "@/components/agency/use-agency";
import { TriangleAlert } from "@/components/icon";

type Compared = { current: number; previous: number };

/** `goodWhen` flips the coloring: cost per lead going down is the good news. */
function Delta({
  current,
  previous,
  goodWhen = "up",
}: Compared & { goodWhen?: "up" | "down" }) {
  if (current === previous) return null;
  const direction = current > previous ? "up" : "down";
  const pct = previous
    ? `${Math.abs(Math.round(((current - previous) / previous) * 100))}%`
    : "new";
  return (
    <span
      className={cn(
        "ml-1.5 text-[11.5px] font-semibold whitespace-nowrap",
        direction === goodWhen ? "text-[#2f6b3f]" : "text-[#a3283a]"
      )}
    >
      {direction === "up" ? "▲" : "▼"} {pct}
    </span>
  );
}

export function ReportsPage() {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const reports = useQuery(trpc.agency.reports.list.queryOptions({ projectId }));

  return (
    <PageShell
      eyebrow="AGENCY"
      title="Reports"
      lead="Your Monday email reports, kept here week by week so you can compare how things move."
    >
      {reports.isPending ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : reports.error ? (
        <p className="text-destructive text-[15px]">{reports.error.message}</p>
      ) : !reports.data.length ? (
        <div className="ring-foreground/10 rounded-[18px] p-8 text-center ring-1 ring-dashed">
          <p className="text-[17px] font-semibold">No reports yet</p>
          <p className="text-muted-foreground mt-1 text-[15px]">
            Every Monday morning you get an email with the week&apos;s numbers,
            and a copy is saved here so you can compare weeks.
          </p>
        </div>
      ) : (
        <TableCard>
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                <TableHead className="pl-6">Week</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Ad spend</TableHead>
                <TableHead className="text-right">Cost per lead</TableHead>
                <TableHead className="text-right">Won</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Highlights</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.data.map((report) => {
                const d = report.data;
                return (
                  <TableRow key={report.id} className="text-[15px]">
                    <TableCell className="py-[18px] pl-6">
                  <span className="font-medium">{d.label}</span>
                  {report.emailedAt && (
                    <p className="text-muted-foreground text-[12px]">
                      Emailed {format(new Date(report.emailedAt), "MMM d")}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {d.leads.current}
                  <Delta {...d.leads} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {d.spendCents ? (
                    <>
                      {formatMoney(d.spendCents.current, d.currency)}
                      <Delta {...d.spendCents} goodWhen="down" />
                    </>
                  ) : (
                    "–"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {d.costPerLeadCents?.current != null ? (
                    <>
                      {formatMoney(d.costPerLeadCents.current, d.currency)}
                      <Delta
                        current={d.costPerLeadCents.current}
                        previous={d.costPerLeadCents.previous ?? 0}
                        goodWhen="down"
                      />
                    </>
                  ) : (
                    "–"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {d.won.current}
                  <Delta {...d.won} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {d.wonValueCents.current || d.wonValueCents.previous ? (
                    <>
                      {formatMoney(d.wonValueCents.current, d.currency)}
                      <Delta {...d.wonValueCents} />
                    </>
                  ) : (
                    "–"
                  )}
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="flex items-center gap-2">
                    {d.alerts.length > 0 && (
                      <HoverInfo
                        title="Needed attention"
                        content={
                          <ul className="list-disc space-y-1 pl-4">
                            {d.alerts.map((alert) => (
                              <li key={alert}>{alert}</li>
                            ))}
                          </ul>
                        }
                      >
                        <span className="text-destructive flex cursor-help items-center gap-1 text-[12.5px] font-medium">
                          <TriangleAlert className="size-3.5" />
                          {d.alerts.length}
                        </span>
                      </HoverInfo>
                    )}
                    {d.topCampaign && (
                      <span className="text-muted-foreground truncate text-[12.5px]">
                        Top: {d.topCampaign.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </PageShell>
  );
}
