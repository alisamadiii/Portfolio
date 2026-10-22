"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/agency-context";
import { StatCard, useAgencyNumbers } from "@/components/agency/ads-performance";
import { formatMoney, LeadStatusBadge } from "@/components/agency/lead-status";
import { useUser } from "@/contexts/user-context";
import { ArrowRight, ExternalLink, Globe, Pencil } from "@/components/icon";
import { AnalyticsPanel } from "@/components/settings/analytics-panel";

const WebsiteCard = () => {
  const { repoId, repo, websiteUrl, role } = useAgency();

  return (
    <div className="bg-card flex flex-wrap items-center gap-4 rounded-lg border p-5">
      <div className="bg-muted grid size-11 shrink-0 place-items-center rounded-full">
        <Globe className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">Your website</p>
        <p className="text-muted-foreground truncate text-[13px]">
          {websiteUrl?.replace(/^https?:\/\//, "") ?? repo}
        </p>
      </div>
      <div className="flex gap-2">
        {websiteUrl && (
          <Button
            variant="outline"
            size="sm"
            render={<a href={websiteUrl} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink className="size-4" />
            Visit
          </Button>
        )}
        {role !== "view-only" && (
          <Button size="sm" render={<Link href={`/p/${repoId}`} />}>
            <Pencil className="size-4" />
            Edit website
          </Button>
        )}
      </div>
    </div>
  );
};

const RecentLeads = () => {
  const trpc = useTRPC();
  const { repoId } = useAgency();
  const { data } = useQuery(
    trpc.agency.leads.list.queryOptions({ repoId, page: 1, pageSize: 5 })
  );

  return (
    <div className="bg-card rounded-lg border">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
          Latest leads
        </p>
        <Link
          href="/agency"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px]"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {!data ? (
        <div className="space-y-2 px-5 pb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      ) : !data.rows.length ? (
        <p className="text-muted-foreground px-5 pb-5 text-[14px]">
          No leads yet. Form submissions from your website show up here.
        </p>
      ) : (
        <ul>
          {data.rows.map((lead) => (
            <li key={lead.id} className="border-t">
              <Link
                href={`/agency/${lead.id}`}
                className="hover:bg-muted/50 flex items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">
                    {lead.name || lead.email || lead.phone || `Lead #${lead.id}`}
                  </p>
                  <p className="text-muted-foreground text-[12.5px]">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <LeadStatusBadge status={lead.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export function AgencyHome() {
  const { user } = useUser();
  const firstName = user?.name?.split(" ")[0];
  const { leads, ads, currency, costPerLead } = useAgencyNumbers(30);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px] font-extrabold tracking-tight">
          Welcome{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-[15px]">
          Your leads, your ads and your website, in one place.
        </p>
      </div>

      <WebsiteCard />

      <div className="space-y-3">
        <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
          Last 30 days
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Leads" value={leads.data ? String(leads.data.leads) : null} />
          <StatCard
            label="Ad spend"
            value={
              ads.isFetching ? null : ads.data ? formatMoney(Math.round(ads.data.totals.cost * 100), currency) : "–"
            }
          />
          <StatCard
            label="Cost per lead"
            value={ads.isFetching || leads.isLoading ? null : (costPerLead ?? "–")}
          />
          <StatCard
            label="Won revenue"
            value={leads.data ? formatMoney(leads.data.wonValueCents) : null}
          />
        </div>
      </div>

      <RecentLeads />

      <div className="-mx-6">
        <AnalyticsPanel />
      </div>
    </div>
  );
}
