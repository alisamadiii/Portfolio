"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";

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

import { useCampaignFilter } from "@/components/agency/campaign-filter";
import { HoverInfo } from "@/components/agency/hover-info";
import { InstallSnippet } from "@/components/agency/install-snippet";
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
import {
  PageShell,
  StatCardRow,
  TableCard,
} from "@/components/agency/page-shell";
import { useAgency, useAgencyHref } from "@/components/agency/use-agency";
import { Calendar, Inbox, Phone, Search } from "@/components/icon";

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
          : "Ad click not verified"
      }
      content={
        <p>
          {campaign.state === "pending"
            ? "Google Ads shares which campaign and keyword a click came from a few hours after the click. It shows here once it's matched."
            : "Google Ads had no record of this click, so we can't confirm it came from your ads. It happens with test clicks, a click ID copied into a link by hand, or when the ad account isn't linked to this hub."}
        </p>
      }
    >
      <span className="text-muted-foreground cursor-help text-[12.5px]">
        {campaign.state === "pending" ? "Matching…" : "Unverified"}
      </span>
    </HoverInfo>
  );
}

/** KPIs + channel mix for a date range, as one divided stat card. */
function LeadsOverview({ days }: { days: RangeValue }) {
  const trpc = useTRPC();
  const { repoId } = useAgency();
  const { campaignId } = useCampaignFilter();
  const range = useMemo(() => lastDays(Number(days)), [days]);
  const { data, isPlaceholderData } = useQuery(
    trpc.agency.leads.stats.queryOptions(
      { repoId, ...range, campaignId: campaignId ?? undefined },
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
    <StatCardRow
      className={cn(
        "transition-opacity duration-200",
        isPlaceholderData && "opacity-50"
      )}
      cells={[
        {
          label: "Leads",
          value: value(String(total)),
          info: {
            title: "Leads",
            content: (
              <p>
                Everyone who sent a form on your website in this period, plus
                leads you added by hand. Spam is left out.
              </p>
            ),
          },
        },
        {
          label: "From Google Ads",
          value: value(String(ads)),
          sub: data ? `${percent(ads, total)} of leads` : undefined,
          info: { title: "From Google Ads", content: <ChannelHelp channel="google_ads" /> },
        },
        {
          label: "Organic search",
          value: value(String(organic)),
          sub: data ? `${percent(organic, total)} of leads` : undefined,
          info: {
            title: "Organic search",
            content: <ChannelHelp channel="organic_search" />,
          },
        },
        {
          label: "Other sources",
          value: value(String(total - ads - organic)),
          sub: data ? "Social, referral, direct…" : undefined,
        },
        {
          label: "Won",
          value: value(String(data?.won ?? 0)),
        },
        {
          label: "Win rate",
          value: value(percent(data?.won ?? 0, total)),
        },
        {
          label: "Won revenue",
          value: value(formatMoney(data?.wonValueCents ?? 0)),
        },
      ]}
      footer={
        mix.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
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
                const won = data?.byChannel.find((c) => c.channel === row.channel);
                return (
                  <HoverInfo
                    key={row.channel}
                    title={CHANNEL_LABELS[row.channel]}
                    content={<ChannelHelp channel={row.channel} />}
                  >
                    <span className="inline-flex cursor-help items-center gap-1.5">
                      <span
                        className={cn("size-2 rounded-full", CHANNEL_BAR[row.channel])}
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
        ) : undefined
      }
    />
  );
}

/** How leads reach the hub: website forms, booking, phone (soon). */
function LeadChannels() {
  const { canInstall } = useAgency();
  const href = useAgencyHref();
  const channels = [
    {
      key: "forms",
      icon: Inbox,
      title: "Website forms",
      on: canInstall,
      sub: canInstall ? "Capturing submissions" : "Add the capture script",
      href: undefined,
    },
    {
      key: "booking",
      icon: Calendar,
      title: "Booking",
      on: true,
      sub: "Appointments booked on your site",
      href: href("/agency/booking"),
    },
    {
      key: "calls",
      icon: Phone,
      title: "Phone calls",
      on: false,
      sub: "Coming soon",
      href: href("/agency/calls"),
    },
  ];
  const onCount = channels.filter((c) => c.on).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[18px] font-semibold">How leads get here</p>
        <span className="text-muted-foreground font-mono text-[13px]">
          {onCount} of {channels.length} on
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const tile = cn(
            "flex flex-col rounded-[14px] p-4 ring-1",
            channel.on
              ? "bg-[#e6efe4]/50 ring-[#2f6b3f]/45 dark:bg-[#2f6b3f]/12 dark:ring-[#5fae74]/30"
              : "bg-[#f6eedb]/50 ring-[#b8860b]/50 dark:bg-[#b8860b]/10 dark:ring-[#d4a43a]/30"
          );
          const inner = (
            <>
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full",
                  channel.on
                    ? "bg-[#e6efe4] text-[#2f6b3f] dark:bg-[#2f6b3f]/30 dark:text-[#8fd19e]"
                    : "bg-[#f6eedb] text-[#8a5a0a] dark:bg-[#b8860b]/25 dark:text-[#e8c06a]"
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <span className="mt-2 flex items-center gap-2 text-[15px] font-semibold">
                {channel.title}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    channel.on
                      ? "bg-[#e6efe4] text-[#2f6b3f] dark:bg-[#2f6b3f]/30 dark:text-[#8fd19e]"
                      : "bg-[#f6eedb] text-[#8a5a0a] dark:bg-[#b8860b]/25 dark:text-[#e8c06a]"
                  )}
                >
                  {channel.on ? "On" : "Soon"}
                </span>
              </span>
              <span className="text-muted-foreground text-[14px]">
                {channel.sub}
              </span>
            </>
          );
          return channel.href ? (
            <Link
              key={channel.key}
              href={channel.href}
              className={cn(tile, "transition-opacity hover:opacity-90")}
            >
              {inner}
            </Link>
          ) : (
            <div key={channel.key} className={tile}>
              {inner}
            </div>
          );
        })}
      </div>
      <InstallSnippet />
    </div>
  );
}

export function LeadsInbox() {
  const trpc = useTRPC();
  const router = useRouter();
  const { repoId, role } = useAgency();
  const href = useAgencyHref();
  const { campaignId } = useCampaignFilter();

  const [days, setDays] = useState<RangeValue>("30");
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

  // The sidebar campaign filter changes the result set, so start over.
  useEffect(() => setPage(1), [campaignId]);

  const { data, isLoading, isPlaceholderData } = useQuery(
    trpc.agency.leads.list.queryOptions(
      {
        repoId,
        status,
        channel: channel === ALL_SOURCES ? undefined : channel,
        campaignId: campaignId ?? undefined,
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

  const controls = (
    <>
      <Select
        items={RANGES}
        value={days}
        onValueChange={(next) => setDays(next as RangeValue)}
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
      {role !== "view-only" && <NewLeadDialog />}
    </>
  );

  return (
    <PageShell
      eyebrow="LEAD TRACKERS"
      title="All leads"
      lead="Everyone who reached out: website forms, booked appointments and leads you added by hand. Mark the ones that became customers as won."
      controls={controls}
    >
      <LeadsOverview days={days} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-foreground/5 flex flex-wrap gap-1 rounded-[12px] p-1">
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
                    "rounded-[9px] px-3.5 py-1.5 text-[14px] font-medium transition-colors",
                    status === option.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                  {option.value === undefined && data ? (
                    <span className="ml-1 tabular-nums opacity-60">
                      {data.total}
                    </span>
                  ) : null}
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
          </div>
        </div>

        <TableCard className={cn(isPlaceholderData && "opacity-50")}>
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                <TableHead className="pl-6">Lead</TableHead>
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
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full rounded" />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.rows.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer text-[15px]"
                  onClick={() => router.push(href(`/agency/${lead.id}`))}
                >
                  <TableCell className="py-[18px] pl-6">
                    <div className="flex items-center gap-3">
                      <span className="bg-foreground/6 grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold">
                        {(lead.name ?? lead.email ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={href(`/agency/${lead.id}`)}
                          className="font-semibold"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {lead.name ||
                            lead.email ||
                            lead.phone ||
                            `Lead #${lead.id}`}
                        </Link>
                        {lead.source === "booking" && lead.bookingAt ? (
                          <p className="text-muted-foreground flex items-center gap-1 text-[13px]">
                            <Calendar className="size-3.5" />
                            Booked {format(new Date(lead.bookingAt), "MMM d, p")}
                            {lead.bookingCanceledAt ? " (canceled)" : ""}
                          </p>
                        ) : lead.message ? (
                          <p className="text-muted-foreground line-clamp-1 max-w-[320px] text-[13px]">
                            {lead.message}
                          </p>
                        ) : lead.email ? (
                          <p className="text-muted-foreground truncate text-[13px]">
                            {lead.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ChannelBadge channel={lead.channel} withInfo />
                    {channelDetail(lead) && (
                      <p className="text-muted-foreground mt-1 line-clamp-1 max-w-[220px] text-[12px]">
                        {channelDetail(lead)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px] text-[14px]">
                    <CampaignCell lead={lead} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[180px] truncate text-[14px]">
                    {urlPath(lead.landingPage ?? lead.pageUrl) ?? ""}
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {lead.valueCents
                      ? formatMoney(lead.valueCents, lead.currency)
                      : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-[14px]">
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
              <p className="mt-3 text-[17px] font-semibold">No leads yet</p>
              <p className="text-muted-foreground mt-1 text-[15px]">
                Form submissions from your website show up here.
              </p>
            </div>
          )}
        </TableCard>

        {pageCount > 1 && (
          <div className="flex items-center justify-end gap-2 text-[14px]">
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

      <LeadChannels />
    </PageShell>
  );
}
