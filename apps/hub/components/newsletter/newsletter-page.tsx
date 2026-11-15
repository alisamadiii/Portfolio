"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { useTRPC } from "@workspace/trpc/client";

import { Padded } from "@/components/ds/layout/padded";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

import { CampaignsSection, NewCampaignDialog } from "./campaigns";
import { ContactsSection } from "./contacts";
import { DomainSection } from "./domain";
import { OverviewSection } from "./overview";
import { SetupCard } from "./setup-card";
import { SuppressionsSection } from "./suppressions";
import { TemplatesSection } from "./templates";
import { QueryError } from "./query-error";
import { useNewsletter } from "./use-newsletter";

const TABS = [
  "overview",
  "campaigns",
  "contacts",
  "templates",
  "suppressions",
  "domain",
] as const;
export type NewsletterTab = (typeof TABS)[number];

/**
 * Newsletter app: the project's own useSend workspace. Full-bleed like Leads:
 * a slim toolbar with the sections, then the section in the padded column.
 */
export function NewsletterPage() {
  const trpc = useTRPC();
  const { projectId, canWrite } = useNewsletter();
  const status = useQuery(trpc.newsletter.status.queryOptions({ projectId }));
  const ready = status.data?.ready === true;
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("overview")
  );
  const go = (next: NewsletterTab) => void setTab(next);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-line bg-surface flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 sm:px-6">
        <h1 className="text-base font-semibold tracking-[-0.01em]">
          Newsletter
        </h1>
        {ready && (
          <div className="-mx-1 min-w-0 overflow-x-auto px-1">
            <SegmentedTabs
              label="Newsletter sections"
              value={tab}
              onChange={(id) => go(id as NewsletterTab)}
              items={[
                { id: "overview", label: "Overview" },
                { id: "campaigns", label: "Campaigns" },
                { id: "contacts", label: "Contacts" },
                { id: "templates", label: "Templates" },
                { id: "suppressions", label: "Suppressions" },
                { id: "domain", label: "Domain" },
              ]}
            />
          </div>
        )}
        {ready && canWrite && (
          <div className="ml-auto">
            <NewCampaignDialog onNeedDomain={() => go("domain")} />
          </div>
        )}
      </div>
      <Padded>
        {status.isLoading && (
          <div className="rounded-card border-line bg-surface h-40 animate-pulse border" />
        )}
        <QueryError error={status.error} onRetry={() => void status.refetch()} />
        {status.data && !ready && <SetupCard />}
        {ready && tab === "overview" && <OverviewSection go={go} />}
        {ready && tab === "campaigns" && <CampaignsSection go={go} />}
        {ready && tab === "contacts" && <ContactsSection />}
        {ready && tab === "templates" && <TemplatesSection />}
        {ready && tab === "suppressions" && <SuppressionsSection />}
        {ready && tab === "domain" && <DomainSection />}
      </Padded>
    </div>
  );
}
