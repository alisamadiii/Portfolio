"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/use-agency";
import { Megaphone } from "@/components/icon";

// ─── Global campaign filter ──────────────────────────────────────
// One campaign scopes lead trackers and marketing together; "All campaigns"
// is the unfiltered default. Lives in the sidebar.

type CampaignFilter = {
  /** null = all campaigns. */
  campaignId: string | null;
  setCampaignId: (id: string | null) => void;
};

const CampaignFilterContext = createContext<CampaignFilter>({
  campaignId: null,
  setCampaignId: () => {},
});

export const useCampaignFilter = () => useContext(CampaignFilterContext);

export function CampaignFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { projectId } = useAgency();
  const key = `ads-campaign:${projectId}`;
  const [campaignId, setState] = useState<string | null>(null);

  // sessionStorage so the pick survives navigation but not a new visit.
  useEffect(() => {
    try {
      setState(sessionStorage.getItem(key));
    } catch {
      /* private mode */
    }
  }, [key]);

  const value = useMemo<CampaignFilter>(
    () => ({
      campaignId,
      setCampaignId: (id) => {
        setState(id);
        try {
          if (id) sessionStorage.setItem(key, id);
          else sessionStorage.removeItem(key);
        } catch {
          /* private mode */
        }
      },
    }),
    [campaignId, key]
  );

  return (
    <CampaignFilterContext.Provider value={value}>
      {children}
    </CampaignFilterContext.Provider>
  );
}

const ALL = "all";

/** The sidebar select. Renders nothing until the account has campaigns. */
export function CampaignFilterSelect() {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const { campaignId, setCampaignId } = useCampaignFilter();
  const campaigns = useQuery(
    trpc.agency.ads.campaigns.queryOptions(
      { projectId },
      { staleTime: 15 * 60 * 1000, retry: false }
    )
  );

  // null = no Ads account linked; an empty list still shows the control.
  if (!campaigns.data) return null;
  const items = [
    { value: ALL, label: "All campaigns" },
    ...campaigns.data.map((campaign) => ({
      value: campaign.id,
      label: campaign.name,
    })),
  ];
  // A stale stored pick for a deleted campaign falls back to all.
  const value = items.some((item) => item.value === campaignId)
    ? campaignId!
    : ALL;

  return (
    <div className="px-3 pt-1 pb-1">
      <p className="text-sidebar-foreground/60 px-0.5 pb-1 text-[10.5px] font-semibold tracking-[0.06em] uppercase">
        Campaign
      </p>
      <Select
        items={items}
        value={value}
        onValueChange={(next) =>
          setCampaignId(next === ALL ? null : String(next))
        }
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "bg-sidebar w-full rounded-md text-[12.5px]",
            value !== ALL && "border-[#fc8464]/50 font-medium"
          )}
        >
          <Megaphone
            className={cn(
              "size-3.5 shrink-0",
              value !== ALL ? "text-[#fc8464]" : "text-sidebar-foreground/50"
            )}
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value !== ALL && (
        <p className="text-sidebar-foreground/60 mt-1 px-0.5 text-[11px]">
          Leads and marketing show this campaign only.
        </p>
      )}
    </div>
  );
}
