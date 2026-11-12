"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTRPC } from "@workspace/trpc/client";
import type { AdCampaign, AdCampaignKeyword } from "@workspace/drizzle/schema";

import { sectionUrl } from "@/components/agency/business-info-config";
import { StepShell } from "@/components/agency/business-info/step-shell";
import { useAgency } from "@/components/agency/use-agency";
import { SideNote } from "@/components/ds/business-info/side-cards";
import { Button, IconButton } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Field, Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";

/** "1,200" when every value parses as a number, else null. */
function sumIfNumeric(values: string[]): string | null {
  const present = values.map((v) => v.trim()).filter(Boolean);
  if (present.length === 0) return null;
  let total = 0;
  for (const value of present) {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(parsed)) return null;
    total += parsed;
  }
  return total.toLocaleString();
}

function avgIfNumeric(values: string[]): string | null {
  const present = values.map((v) => v.trim()).filter(Boolean);
  if (present.length === 0) return null;
  let total = 0;
  for (const value of present) {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(parsed)) return null;
    total += parsed;
  }
  return (total / present.length).toFixed(2);
}

function campaignSummary(campaign: AdCampaign): string {
  const parts = [
    `${campaign.keywords.length} ${campaign.keywords.length === 1 ? "keyword" : "keywords"}`,
  ];
  const searches = sumIfNumeric(campaign.keywords.map((k) => k.avgMonthlySearches));
  if (searches) parts.push(`${searches} monthly searches`);
  const cpc = avgIfNumeric(campaign.keywords.map((k) => k.maxCpc));
  if (cpc) parts.push(`$${cpc} avg max CPC`);
  if (campaign.niche) parts.push(campaign.niche);
  return parts.join(" · ");
}

function KeywordPlannerNote() {
  return (
    <SideNote title="Where do the numbers come from?">
      <p className="text-[13px] leading-normal text-dim">
        Google&apos;s Keyword Planner (free, inside Google Ads) shows the average monthly searches
        and a top-of-page bid for every keyword. Copy them in here so we can size each campaign
        before spending a dollar.
      </p>
      <a
        href="https://ads.google.com/aw/keywordplanner/home"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-coral-text"
      >
        Open Keyword Planner <ExternalLink className="size-3" />
      </a>
    </SideNote>
  );
}

/** Step 6 index: one row per keyword group (= one planned campaign). */
export function CampaignsIndex() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { projectId } = useAgency();

  const campaigns = useQuery(trpc.agency.campaigns.list.queryOptions({ projectId }));
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const create = useMutation(
    trpc.agency.campaigns.create.mutationOptions({
      onSuccess: (campaign) => {
        void queryClient.invalidateQueries({ queryKey: trpc.agency.campaigns.pathKey() });
        setOpen(false);
        setName("");
        router.push(`${sectionUrl(projectId, "keywords")}/${campaign.id}`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const addButton = (
    <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setOpen(true)}>
      Add keyword group
    </Button>
  );

  return (
    <StepShell stepKey="keywords" aside={<KeywordPlannerNote />}>
      {campaigns.isPending ? (
        <Skeleton className="h-64 w-full rounded-card" />
      ) : campaigns.error ? (
        <p className="text-sm text-danger">{campaigns.error.message}</p>
      ) : (
        <Card>
          <CardHeader title="Keyword groups" action={addButton} divided />
          {campaigns.data.length === 0 ? (
            <EmptyState
              icon={<Tags className="size-5" />}
              title="No keyword groups yet"
              text='Add one for each campaign you are planning, like "Online courses". Each group becomes one campaign.'
            />
          ) : (
            campaigns.data.map((campaign) => (
              <Link
                key={campaign.id}
                href={`${sectionUrl(projectId, "keywords")}/${campaign.id}`}
                className="flex items-center gap-4 border-b border-divider px-6 py-4 last:border-b-0 hover:bg-sidebar"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{campaign.name}</span>
                  <span className="text-[13px] text-dim">{campaignSummary(campaign)}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-faint" />
              </Link>
            ))
          )}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New keyword group</DialogTitle>
          </DialogHeader>
          <Field label="Group name" hint="One group = one campaign.">
            <Input
              value={name}
              placeholder="e.g. Online courses"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) create.mutate({ projectId, name: name.trim() });
              }}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="primary"
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate({ projectId, name: name.trim() })}
            >
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StepShell>
  );
}

const EMPTY_KEYWORD: AdCampaignKeyword = { text: "", avgMonthlySearches: "", maxCpc: "" };

/** One keyword group's editor: name, niche and the keyword table. */
export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { projectId } = useAgency();

  const campaigns = useQuery(trpc.agency.campaigns.list.queryOptions({ projectId }));
  const campaign = campaigns.data?.find((c) => c.id === campaignId);

  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [rows, setRows] = useState<AdCampaignKeyword[]>([]);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!campaign) return;
    setName(campaign.name);
    setNiche(campaign.niche);
    setRows(campaign.keywords.length > 0 ? campaign.keywords : [{ ...EMPTY_KEYWORD }]);
    setDirty(false);
  }, [campaign]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.agency.campaigns.pathKey() });

  const update = useMutation(
    trpc.agency.campaigns.update.mutationOptions({
      onSuccess: () => {
        setSavedAt(new Date());
        setDirty(false);
        void invalidate();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    trpc.agency.campaigns.remove.mutationOptions({
      onSuccess: () => {
        void invalidate();
        router.push(sectionUrl(projectId, "keywords"));
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const saveAnd = async (to?: string) => {
    if (!campaign || !name.trim()) return;
    try {
      await update.mutateAsync({
        projectId,
        id: campaign.id,
        name: name.trim(),
        niche: niche.trim(),
        keywords: rows,
      });
      if (to) router.push(to);
    } catch {
      // onError toasted
    }
  };

  const setRow = (i: number, patch: Partial<AdCampaignKeyword>) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  return (
    <StepShell
      stepKey="keywords"
      footer={{ dirty, saving: update.isPending, savedAt, saveAnd }}
      aside={
        <>
          <SideNote title="Reading the numbers">
            <p className="text-[13px] leading-normal text-dim">
              Avg. monthly searches tells you how many people look for this each month; max CPC is
              roughly what one click costs. High searches and a CPC you can afford make a keyword
              worth bidding on.
            </p>
          </SideNote>
          <KeywordPlannerNote />
        </>
      }
    >
      {campaigns.isPending ? (
        <Skeleton className="h-64 w-full rounded-card" />
      ) : campaigns.error ? (
        <p className="text-sm text-danger">{campaigns.error.message}</p>
      ) : !campaign ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-dim">Keyword group not found.</p>
          <Link
            href={sectionUrl(projectId, "keywords")}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-coral-text"
          >
            <ChevronLeft className="size-3.5" /> Keywords
          </Link>
        </Card>
      ) : (
        <Card className="flex flex-col gap-6 p-6">
          <Link
            href={sectionUrl(projectId, "keywords")}
            className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-ink-3 hover:text-ink"
          >
            <ChevronLeft className="size-3.5" /> All keyword groups
          </Link>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Group name" hint="One group = one campaign, e.g. Online courses.">
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
            <Field label="Niche" hint="The market this group competes in; it feeds the ad prompt.">
              <Input
                value={niche}
                placeholder="e.g. Websites for local service businesses"
                onChange={(e) => {
                  setNiche(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[1fr_10rem_7rem_2rem] items-center gap-2.5 pb-2 text-xs font-medium text-dim">
                <span>Keyword</span>
                <span>Avg. monthly searches</span>
                <span>Max CPC</span>
                <span />
              </div>
              <div className="flex flex-col gap-2.5">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_10rem_7rem_2rem] items-center gap-2.5">
                    <Input
                      aria-label={`Keyword ${i + 1}`}
                      value={row.text}
                      placeholder="e.g. best online marketing courses"
                      onChange={(e) => setRow(i, { text: e.target.value })}
                    />
                    <Input
                      aria-label={`Avg. monthly searches ${i + 1}`}
                      value={row.avgMonthlySearches}
                      placeholder="e.g. 50"
                      onChange={(e) => setRow(i, { avgMonthlySearches: e.target.value })}
                    />
                    <Input
                      aria-label={`Max CPC ${i + 1}`}
                      value={row.maxCpc}
                      placeholder="e.g. 2.77"
                      onChange={(e) => setRow(i, { maxCpc: e.target.value })}
                    />
                    <IconButton
                      aria-label={`Remove keyword ${i + 1}`}
                      className={rows.length > 1 ? "size-8" : "invisible size-8"}
                      onClick={() => {
                        setRows((prev) => prev.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="subtle"
              size="sm"
              icon={<Plus className="size-3.5" />}
              onClick={() => {
                setRows((prev) => [...prev, { ...EMPTY_KEYWORD }]);
                setDirty(true);
              }}
            >
              Add keyword
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              disabled={remove.isPending}
              onClick={() => {
                if (confirm(`Delete "${campaign.name}" and its keywords?`))
                  remove.mutate({ projectId, id: campaign.id });
              }}
            >
              Delete group
            </Button>
          </div>
        </Card>
      )}
    </StepShell>
  );
}
