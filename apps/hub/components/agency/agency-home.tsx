"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useAgencyNumbers } from "@/components/agency/ads-performance";
import { BUSINESS_STEPS } from "@/components/agency/business-info-config";
import {
  doneCount,
  stepStatuses,
} from "@/components/agency/business-info/status";
import { ChannelBadge } from "@/components/agency/lead-channel";
import { formatMoney, LeadStatusBadge } from "@/components/agency/lead-status";
import {
  FrameCard,
  PageShell,
  StatCardRow,
} from "@/components/agency/page-shell";
import { useAgency, useAgencyHref } from "@/components/agency/use-agency";
import { ArrowRight, Calendar, Check, Megaphone } from "@/components/icon";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

type Tile = {
  key: string;
  label: string;
  done: boolean;
  sub: string;
  href: string;
  cta: string;
};

/** The "Finish setting up" checklist — onboarding tiles. */
function SetupChecklist() {
  const trpc = useTRPC();
  const { projectId, repo, adsConnected, adsType, conversionsWired } = useAgency();
  const href = useAgencyHref();
  // Search-campaign tiles don't apply to an LSA-only client.
  const searchAds = adsConnected && adsType !== "lsa";

  const booking = useQuery(trpc.agency.booking.status.queryOptions({ projectId }));
  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ projectId }));
  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ projectId })
  );
  const firstLead = useQuery(
    trpc.agency.leads.list.queryOptions({ projectId, page: 1, pageSize: 1 })
  );
  const negativeLists = useQuery(
    trpc.agency.ads.negativeLists.list.queryOptions(
      { projectId },
      { enabled: searchAds, retry: false }
    )
  );

  if (
    booking.isPending ||
    info.isPending ||
    campaigns.isPending ||
    firstLead.isPending ||
    (searchAds && negativeLists.isPending)
  )
    return null;

  const bookingOn = Boolean(booking.data?.connected && booking.data?.settings);
  const infoDone = doneCount(
    stepStatuses(info.data ?? {}, campaigns.data ?? [])
  );
  const totalSteps = BUSINESS_STEPS.length;

  const tiles: Tile[] = [
    {
      key: "ads",
      label: "Google Ads connected",
      done: adsConnected,
      sub: adsConnected ? "Linked" : "Connect to track spend and leads",
      href: "/integrations",
      cta: "Connect",
    },
    {
      key: "booking",
      label: "Booking on",
      done: bookingOn,
      sub: bookingOn ? "Taking bookings" : "Let people book a call",
      href: href("/agency/booking"),
      cta: "Set up",
    },
    {
      key: "website",
      label: "Connect website",
      done: Boolean(repo),
      sub: repo ? "Connected" : "Add our scripts, or ask us to build one",
      href: href("/settings/domain"),
      cta: "Set up",
    },
    {
      key: "info",
      label: "Business info",
      done: infoDone >= totalSteps,
      sub: `${infoDone} of ${totalSteps} sections done`,
      href: href("/business-info"),
      cta: "Continue",
    },
    {
      key: "first-lead",
      label: "First lead captured",
      done: (firstLead.data?.total ?? 0) > 0,
      sub:
        (firstLead.data?.total ?? 0) > 0
          ? "Leads are coming in"
          : "Install the form script and send a test lead",
      href: href("/settings/domain"),
      cta: "Set up",
    },
    ...(searchAds
      ? [
          {
            key: "conversions",
            label: "Conversion actions wired",
            done: conversionsWired,
            sub: conversionsWired
              ? "Leads report to Google Ads"
              : "Without this, Google optimizes blind",
            href: href("/marketing/conversions"),
            cta: "Wire up",
          },
          {
            key: "negatives",
            label: "Negative lists applied",
            done: (negativeLists.data?.applied.length ?? 0) > 0,
            sub:
              (negativeLists.data?.applied.length ?? 0) > 0
                ? "Blocking junk searches"
                : "Block job seekers and DIYers",
            href: href("/marketing/search-terms"),
            cta: "Apply",
          },
        ]
      : []),
  ];

  if (tiles.every((t) => t.done)) return null;
  const currentKey = tiles.find((t) => !t.done)?.key;

  return (
    <FrameCard innerClassName="flex flex-col gap-5 p-7">
      <div className="flex items-center justify-between">
        <p className="text-[18px] font-semibold">Finish setting up</p>
        <span className="text-muted-foreground font-mono text-[13px]">
          {tiles.filter((t) => t.done).length} of {tiles.length} done
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className={cn(
              "flex flex-col gap-2 rounded-[14px] p-4 ring-1 transition-colors",
              tile.done
                ? "ring-foreground/7 bg-foreground/2"
                : tile.key === currentKey
                  ? "ring-primary/50 bg-primary/6 ring-1"
                  : "ring-foreground/7 hover:bg-foreground/3"
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full font-mono text-[13px]",
                tile.done
                  ? "bg-[#e6efe4] text-[#2f6b3f]"
                  : tile.key === currentKey
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/5 text-muted-foreground"
              )}
            >
              {tile.done ? <Check className="size-4" /> : "→"}
            </span>
            <span className="text-[15px] font-semibold">{tile.label}</span>
            <span className="text-muted-foreground text-[14px]">{tile.sub}</span>
            {!tile.done && (
              <span className="text-primary mt-auto text-[14px] font-medium">
                {tile.cta} →
              </span>
            )}
          </Link>
        ))}
      </div>
    </FrameCard>
  );
}

function RecentLeads() {
  const href = useAgencyHref();
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const { data } = useQuery(
    trpc.agency.leads.list.queryOptions({ projectId, page: 1, pageSize: 5 })
  );

  return (
    <div className="bg-card ring-foreground/7 min-w-0 flex-[2_1_380px] rounded-[18px] shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <p className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
          Latest leads
        </p>
        <Link
          href={href("/agency")}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[14px]"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {!data ? (
        <div className="flex flex-col gap-2 px-6 pb-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !data.rows.length ? (
        <p className="text-muted-foreground px-6 pb-6 text-[15px]">
          No leads yet. Form submissions from your website show up here.
        </p>
      ) : (
        <ul className="divide-foreground/7 divide-y">
          {data.rows.map((lead) => (
            <li key={lead.id}>
              <Link
                href={href(`/agency/${lead.id}`)}
                className="hover:bg-foreground/2 flex items-center gap-3 px-6 py-3.5"
              >
                <span className="bg-foreground/6 grid size-10 shrink-0 place-items-center rounded-full text-[14px] font-semibold">
                  {(lead.name ?? lead.email ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">
                    {lead.name || lead.email || lead.phone || `Lead #${lead.id}`}
                  </p>
                  <p className="text-muted-foreground text-[13px]">
                    {formatDistanceToNow(new Date(lead.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <ChannelBadge
                  channel={lead.channel}
                  className="hidden sm:inline-flex"
                />
                <LeadStatusBadge status={lead.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NextBooking() {
  const href = useAgencyHref();
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const bookings = useQuery(trpc.agency.booking.list.queryOptions({ projectId }));

  const next = bookings.data
    ?.filter(
      (b) => !b.bookingCanceledAt && b.bookingAt && new Date(b.bookingAt) >= new Date()
    )
    .sort(
      (a, b) =>
        new Date(a.bookingAt!).getTime() - new Date(b.bookingAt!).getTime()
    )[0];

  if (!next?.bookingAt) return null;
  const at = new Date(next.bookingAt);

  return (
    <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-3 rounded-[18px] bg-[#1b1a17] p-6 text-[#ece9e2]">
      <span className="text-primary flex items-center gap-2 font-mono text-[12px] tracking-[0.1em] uppercase">
        <Calendar className="size-3.5" /> Next booking
      </span>
      <p className="text-[24px] font-semibold tracking-[-0.02em]">
        {format(at, "EEE, MMM d")}
      </p>
      <p className="text-[15px] text-[#b8b2a7]">
        {format(at, "p")} · {next.booking?.typeName ?? "Meeting"}
      </p>
      <p className="text-[15px] text-[#ece9e2]">
        {next.name ?? next.email ?? "Visitor"}
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          className="bg-primary text-primary-foreground"
          render={<Link href={href(`/agency/${next.id}`)} />}
        >
          View lead
        </Button>
        <Button
          size="sm"
          className="bg-[#ece9e2]/10 text-[#ece9e2]"
          render={<Link href={href("/agency/booking")} />}
        >
          All bookings
        </Button>
      </div>
    </div>
  );
}

function AdsThisMonth() {
  const href = useAgencyHref();
  const { ads, currency } = useAgencyNumbers(30);
  if (!ads.data) return null;
  const paused = ads.data.campaigns.some((c) => c.status !== "ENABLED");

  return (
    <div className="bg-card ring-foreground/7 flex min-w-0 flex-[1_1_240px] flex-col gap-3 rounded-[18px] p-6 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
      <span className="flex items-center gap-2 font-mono text-[12px] tracking-[0.1em] text-muted-foreground uppercase">
        <Megaphone className="size-3.5" /> Ads this month
      </span>
      <p className="text-[32px] font-semibold tracking-[-0.03em] tabular-nums">
        {formatMoney(Math.round(ads.data.totals.cost * 100), currency)}
      </p>
      <p className="text-muted-foreground text-[14px]">
        Spent across {ads.data.campaigns.length}{" "}
        {ads.data.campaigns.length === 1 ? "campaign" : "campaigns"}
      </p>
      {paused && (
        <div className="rounded-[10px] bg-[#f6eedb] px-3 py-2 text-[13px] text-[#8a5a0a]">
          A campaign is paused — leads may be dropping.
        </div>
      )}
      <Link
        href={href("/marketing")}
        className="text-primary mt-auto text-[14px] font-medium"
      >
        Details →
      </Link>
    </div>
  );
}

export function AgencyHome() {
  const user = useCurrentUser().data?.user ?? null;
  const firstName = user?.name?.split(" ")[0];
  const { leads, ads, currency, costPerLead, adLeads } = useAgencyNumbers(30);
  const organic =
    leads.data?.byChannel.find((row) => row.channel === "organic_search")
      ?.leads ?? 0;

  return (
    <PageShell
      eyebrow={format(new Date(), "EEEE, MMMM d")}
      title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
      lead="Your leads, your ads and your website, in one place."
    >
      <SetupChecklist />

      <StatCardRow
        cells={[
          {
            label: "Leads",
            value: leads.data ? String(leads.data.leads) : null,
          },
          { label: "From ads", value: adLeads === null ? null : String(adLeads) },
          { label: "Organic", value: leads.data ? String(organic) : null },
          {
            label: "Ad spend",
            value: ads.isFetching
              ? null
              : ads.data
                ? formatMoney(Math.round(ads.data.totals.cost * 100), currency)
                : "–",
          },
          {
            label: "Cost per ad lead",
            value:
              ads.isFetching || leads.isLoading ? null : (costPerLead ?? "–"),
          },
          {
            label: "Won revenue",
            value: leads.data ? formatMoney(leads.data.wonValueCents) : null,
          },
        ]}
      />

      <div className="flex flex-wrap gap-6">
        <RecentLeads />
        <NextBooking />
        <AdsThisMonth />
      </div>
    </PageShell>
  );
}
