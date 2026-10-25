"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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
import type { LsaLead } from "@workspace/trpc/lib/google-ads";

import {
  formatMoney,
  lastDays,
  RANGES,
  type RangeValue,
  StatusPill,
} from "@/components/agency/lead-status";
import { MarketingTabs } from "@/components/agency/marketing-tabs";
import {
  PageShell,
  StatCardRow,
  TableCard,
} from "@/components/agency/page-shell";
import { useAgency } from "@/components/agency/use-agency";
import { Calendar, Mail, Megaphone, Phone } from "@/components/icon";

const titleCase = (value: string) =>
  value
    ? value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ")
    : "";

const LEAD_TYPE: Record<string, { label: string; Icon: typeof Phone }> = {
  PHONE_CALL: { label: "Call", Icon: Phone },
  MESSAGE: { label: "Message", Icon: Mail },
  BOOKING: { label: "Booking", Icon: Calendar },
};

const CHARGED: Record<
  LsaLead["chargedStatus"],
  { label: string; tone: "success" | "neutral" | "warning" }
> = {
  charged: { label: "Charged", tone: "success" },
  credited: { label: "Credited", tone: "neutral" },
  credit_pending: { label: "Credit pending", tone: "warning" },
  not_charged: { label: "Not charged", tone: "neutral" },
};

export function LsaPage() {
  const trpc = useTRPC();
  const { repoId, adsConnected } = useAgency();
  const [days, setDays] = useState<RangeValue>("30");
  const range = useMemo(() => lastDays(Number(days)), [days]);

  const stats = useQuery(
    trpc.agency.ads.lsa.stats.queryOptions(
      { repoId, ...range },
      {
        enabled: adsConnected,
        staleTime: 5 * 60_000,
        placeholderData: keepPreviousData,
      }
    )
  );
  const leads = useQuery(
    trpc.agency.ads.lsa.leads.queryOptions(
      { repoId, ...range },
      {
        enabled: adsConnected,
        staleTime: 5 * 60_000,
        placeholderData: keepPreviousData,
      }
    )
  );

  const currency = "USD";
  const cost = stats.data?.totals.cost ?? 0;
  const charged = leads.data?.filter((lead) => lead.chargedStatus === "charged");
  const credited = leads.data?.filter(
    (lead) =>
      lead.chargedStatus === "credited" || lead.chargedStatus === "credit_pending"
  );

  const controls = (
    <Select
      items={RANGES}
      value={days}
      onValueChange={(value) => setDays(value as RangeValue)}
    >
      <SelectTrigger size="lg" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const notConnected = !adsConnected || (leads.isSuccess && leads.data === null);

  return (
    <PageShell
      eyebrow="MARKETING · LOCAL SERVICES"
      title="Local Services Ads"
      lead="The calls, messages and bookings your Local Services Ads brought in. Google charges per lead, not per click, so dispute the bad ones."
      controls={notConnected ? undefined : controls}
      tabs={<MarketingTabs />}
    >
      {notConnected ? (
        <div className="ring-foreground/10 rounded-[18px] px-6 py-14 text-center ring-1 ring-dashed">
          <Megaphone className="text-muted-foreground mx-auto size-8" />
          <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.02em]">
            Your ads aren&apos;t connected yet
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[420px] text-[15px]">
            Once your Google Ads account is linked and the Local Services
            campaign is live, its leads show up here.
          </p>
        </div>
      ) : stats.error || leads.error ? (
        <p className="text-destructive text-[15px]">
          {(stats.error ?? leads.error)?.message}
        </p>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-6 transition-opacity duration-200",
            (stats.isPlaceholderData || leads.isPlaceholderData) && "opacity-50"
          )}
        >
          <StatCardRow
            cells={[
              {
                label: "LSA spend",
                value: stats.data
                  ? formatMoney(Math.round(cost * 100), currency)
                  : null,
              },
              {
                label: "Leads",
                value: leads.data ? String(leads.data.length) : null,
              },
              {
                label: "Cost per charged lead",
                value: leads.data
                  ? charged?.length
                    ? formatMoney(
                        Math.round((cost / charged.length) * 100),
                        currency
                      )
                    : "–"
                  : null,
                sub: charged ? `${charged.length} charged` : undefined,
              },
              {
                label: "Credited",
                value: credited ? String(credited.length) : null,
                sub: "Disputed or refunded leads",
              },
            ]}
          />

          <TableCard>
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                  <TableHead className="pl-6">Lead</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="pr-6 text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.isPending && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-6">
                      <Skeleton className="h-24 w-full rounded" />
                    </TableCell>
                  </TableRow>
                )}
                {leads.data?.map((lead) => {
                  const type = LEAD_TYPE[lead.leadType] ?? {
                    label: titleCase(lead.leadType),
                    Icon: Phone,
                  };
                  const billing = CHARGED[lead.chargedStatus];
                  return (
                    <TableRow key={lead.id} className="text-[15px]">
                      <TableCell className="py-[16px] pl-6">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <type.Icon className="text-muted-foreground size-4" />
                          {type.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {lead.contact ? (
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {lead.contact.name || "Unnamed"}
                            </p>
                            <p className="text-muted-foreground truncate text-[13px]">
                              {lead.contact.phone ?? lead.contact.email ?? ""}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Hidden by Google
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[14px]">
                        {titleCase(lead.service || lead.category)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={billing.tone} dot={false}>
                          {billing.label}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-muted-foreground pr-6 text-right text-[14px]">
                        {lead.createdAt
                          ? format(new Date(lead.createdAt), "MMM d, p")
                          : "–"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {leads.data && !leads.data.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-10 text-center"
                    >
                      No Local Services leads in this range yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableCard>
        </div>
      )}
    </PageShell>
  );
}
