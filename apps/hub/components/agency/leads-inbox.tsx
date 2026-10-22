"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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
import type {
  AgencyLeadChannel,
  AgencyLeadStatus,
} from "@workspace/drizzle/schema";

import { StatCard } from "@/components/agency/ads-performance";
import { HoverInfo } from "@/components/agency/hover-info";
import {
  CHANNEL_HELP,
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  ChannelBadge,
  channelDetail,
  ChannelHelp,
  leadCampaign,
  urlPath,
} from "@/components/agency/lead-channel";
import {
  formatMoney,
  lastDays,
  LEAD_STATUSES,
  LeadStatusBadge,
  RANGES,
  type RangeValue,
} from "@/components/agency/lead-status";
import { NewLeadDialog } from "@/components/agency/new-lead-dialog";
import { useAgency } from "@/components/agency/use-agency";
import { Inbox, Search } from "@/components/icon";

const PAGE_SIZE = 25;
const ALL_SOURCES = "all";

// Bar colours per channel, matching the badge tones.
const CHANNEL_BAR: Record<AgencyLeadChannel, string> = {
  google_ads: "bg-orange-500",
  paid_other: "bg-rose-500",
  organic_search: "bg-emerald-500",
  social: "bg-sky-500",
  email: "bg-violet-500",
  referral: "bg-teal-500",
  direct: "bg-stone-400",
  manual: "bg-stone-300",
};

const percent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : "–";

function CampaignCell({ lead }: { lead: Parameters<typeof leadCampaign>[0] }) {
  const campaign = leadCampaign(lead);
  if (campaign.state === "found") {
    return (
      <>
        <p className="truncate font-medium">{campaign.name}</p>
        {(campaign.keyword || campaign.adGroup) && (
          <p className="text-muted-foreground truncate text-[12px]">
            {[campaign.keyword && `"${campaign.keyword}"`, campaign.adGroup]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </>
    );
  }
  if (campaign.state === "none") return null;
  return (
    <HoverInfo
      title={
        campaign.state === "pending"
          ? "Matching with Google Ads"
          : "Campaign not found"
      }
      content={
        <p>
          {campaign.state === "pending"
            ? "Google Ads shares which campaign and keyword a click came from a few hours after the click. It shows here once it's matched."
            : "Google Ads had no record of this click. It can happen with test clicks, or when the ad account isn't linked to this hub."}
        </p>
      }
    >
      <span className="text-muted-foreground cursor-help text-[12.5px]">
        {campaign.state === "pending" ? "Matching…" : "Not found"}
      </span>
    </HoverInfo>
  );
}

/** KPIs and the channel mix for a date range, above the inbox. */
function LeadsOverview() {
  const trpc = useTRPC();
  const { repoId } = useAgency();
  const [days, setDays] = useState<RangeValue>("30");
  const range = useMemo(() => lastDays(Number(days)), [days]);
  const { data, isPlaceholderData } = useQuery(
    trpc.agency.leads.stats.queryOptions(
      { repoId, ...range },
      { placeholderData: keepPreviousData }
    )
  );

  const count = (channel: AgencyLeadChannel) =>
    data?.byChannel.find((row) => row.channel === channel)?.leads ?? 0;
  const total = data?.leads ?? 0;
  const ads = count("google_ads");
  const organic = count("organic_search");
  const mix = CHANNEL_ORDER.map((channel) => ({
    channel,
    leads: count(channel),
  })).filter((row) => row.leads > 0);
  const value = (text: string) => (data ? text : null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
          Overview
        </p>
        <Select
          items={RANGES}
          value={days}
          onValueChange={(next) => setDays(next as RangeValue)}
        >
          <SelectTrigger className="w-40">
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
      </div>

      <div
        className={cn(
          "space-y-3 transition-opacity duration-200",
          isPlaceholderData && "opacity-50"
        )}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          <StatCard
            label="Leads"
            value={value(String(total))}
            info={
              <p>
                Everyone who sent a form on your website in this period, plus
                leads you added by hand. Spam is left out.
              </p>
            }
          />
          <StatCard
            label="From Google Ads"
            value={value(String(ads))}
            hint={data ? `${percent(ads, total)} of leads` : undefined}
            info={<ChannelHelp channel="google_ads" />}
          />
          <StatCard
            label="Organic search"
            value={value(String(organic))}
            hint={data ? `${percent(organic, total)} of leads` : undefined}
            info={<ChannelHelp channel="organic_search" />}
          />
          <StatCard
            label="Other sources"
            value={value(String(total - ads - organic))}
            hint={data ? "Social, referral, direct…" : undefined}
            info={
              <>
                <p>
                  Every lead that didn&apos;t come from Google Ads or organic
                  search.
                </p>
                <ul className="text-muted-foreground list-disc space-y-1 pl-4">
                  {CHANNEL_ORDER.filter(
                    (channel) =>
                      channel !== "google_ads" && channel !== "organic_search"
                  ).map((channel) => (
                    <li key={channel}>
                      <span className="text-foreground font-medium">
                        {CHANNEL_LABELS[channel]}:
                      </span>{" "}
                      {CHANNEL_HELP[channel].what}
                    </li>
                  ))}
                </ul>
              </>
            }
          />
          <StatCard
            label="Won"
            value={value(String(data?.won ?? 0))}
            info={
              <p>
                Leads marked as Won in this period, counted by the day they were
                won, not the day they came in.
              </p>
            }
          />
          <StatCard
            label="Win rate"
            value={value(percent(data?.won ?? 0, total))}
            info={<p>Won deals divided by leads in this period.</p>}
          />
          <StatCard
            label="Won revenue"
            value={value(formatMoney(data?.wonValueCents ?? 0))}
            info={
              <p>
                The deal values you entered on leads marked as Won in this
                period.
              </p>
            }
          />
        </div>

        {mix.length > 0 && (
          <div className="bg-card space-y-3 rounded-lg border p-4">
            <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
              Where leads came from
            </p>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              {mix.map((row) => (
                <div
                  key={row.channel}
                  className={CHANNEL_BAR[row.channel]}
                  style={{ width: `${(row.leads / total) * 100}%` }}
                  title={`${CHANNEL_LABELS[row.channel]}: ${row.leads}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
              {mix.map((row) => {
                const won = data?.byChannel.find(
                  (c) => c.channel === row.channel
                );
                return (
                  <HoverInfo
                    key={row.channel}
                    title={CHANNEL_LABELS[row.channel]}
                    content={<ChannelHelp channel={row.channel} />}
                  >
                    <span className="inline-flex cursor-help items-center gap-1.5">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          CHANNEL_BAR[row.channel]
                        )}
                      />
                      <span className="font-medium">
                        {CHANNEL_LABELS[row.channel]}
                      </span>
                      <span className="text-muted-foreground">
                        {row.leads} · {percent(row.leads, total)}
                        {won?.won ? ` · ${won.won} won` : ""}
                      </span>
                    </span>
                  </HoverInfo>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadsInbox() {
  const trpc = useTRPC();
  const router = useRouter();
  const { repoId, role } = useAgency();

  const [status, setStatus] = useState<AgencyLeadStatus | undefined>();
  const [channel, setChannel] = useState<
    AgencyLeadChannel | typeof ALL_SOURCES
  >(ALL_SOURCES);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isPlaceholderData } = useQuery(
    trpc.agency.leads.list.queryOptions(
      {
        repoId,
        status,
        channel: channel === ALL_SOURCES ? undefined : channel,
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      },
      { placeholderData: keepPreviousData }
    )
  );

  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const sourceItems = [
    { value: ALL_SOURCES, label: "All sources" },
    ...CHANNEL_ORDER.map((value) => ({ value, label: CHANNEL_LABELS[value] })),
  ];

  return (
    <div className="space-y-6">
      <LeadsOverview />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {[{ value: undefined, label: "All" }, ...LEAD_STATUSES].map(
              (option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setStatus(option.value);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                    status === option.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              )
            )}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              items={sourceItems}
              value={channel}
              onValueChange={(next) => {
                setChannel(next as AgencyLeadChannel | typeof ALL_SOURCES);
                setPage(1);
              }}
            >
              <SelectTrigger size="lg" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceItems.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, phone"
                className="h-10 w-64 py-0 pl-8"
              />
            </div>
            {role !== "view-only" && <NewLeadDialog />}
          </div>
        </div>

        <div
          className={cn(
            "bg-card overflow-hidden rounded-lg border transition-opacity duration-200",
            isPlaceholderData && "opacity-50"
          )}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Landing page</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full rounded" />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.rows.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/agency/${lead.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/agency/${lead.id}`}
                      className="font-semibold"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {lead.name ||
                        lead.email ||
                        lead.phone ||
                        `Lead #${lead.id}`}
                    </Link>
                    {lead.message && (
                      <p className="text-muted-foreground line-clamp-1 max-w-[320px] text-[13px]">
                        {lead.message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    <div>{lead.email}</div>
                    <div className="text-muted-foreground">{lead.phone}</div>
                  </TableCell>
                  <TableCell>
                    <ChannelBadge channel={lead.channel} withInfo />
                    {channelDetail(lead) && (
                      <p className="text-muted-foreground mt-1 line-clamp-1 max-w-[220px] text-[12px]">
                        {channelDetail(lead)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px] text-[13px]">
                    <CampaignCell lead={lead} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[180px] truncate text-[13px]">
                    {urlPath(lead.landingPage ?? lead.pageUrl) ?? ""}
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-right text-[13px]">
                    {lead.valueCents
                      ? formatMoney(lead.valueCents, lead.currency)
                      : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-[13px]">
                    {formatDistanceToNow(new Date(lead.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data && !data.rows.length && (
            <div className="px-6 py-14 text-center">
              <Inbox className="text-muted-foreground mx-auto size-8" />
              <p className="mt-3 font-semibold">No leads yet</p>
              <p className="text-muted-foreground mt-1 text-[14px]">
                Form submissions from your website show up here.
              </p>
            </div>
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-end gap-2 text-[13px]">
            <span className="text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
