"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";
import type { AdCampaign, AdCampaignKeyword } from "@workspace/drizzle/schema";

import { sectionUrl } from "@/components/agency/business-info-config";
import {
  FieldHead,
  FrameCard,
  StepShell,
} from "@/components/agency/business-info/step-shell";
import { useAgency } from "@/components/agency/use-agency";
import { ArrowLeft, ChevronRight, Plus, Trash } from "@/components/icon";

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
  const searches = sumIfNumeric(
    campaign.keywords.map((k) => k.avgMonthlySearches)
  );
  if (searches) parts.push(`${searches} monthly searches`);
  const cpc = avgIfNumeric(campaign.keywords.map((k) => k.maxCpc));
  if (cpc) parts.push(`$${cpc} avg max CPC`);
  if (campaign.niche) parts.push(campaign.niche);
  return parts.join(" · ");
}

/** Step 6 index: one row per keyword group (= one planned campaign). */
export function CampaignsIndex() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { repoId } = useAgency();

  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ repoId })
  );
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const create = useMutation(
    trpc.agency.campaigns.create.mutationOptions({
      onSuccess: (campaign) => {
        queryClient.invalidateQueries({
          queryKey: trpc.agency.campaigns.pathKey(),
        });
        setOpen(false);
        setName("");
        router.push(`${sectionUrl(repoId, "keywords")}/${campaign.id}`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <StepShell
      stepKey="keywords"
      aside={
        <div className="ring-foreground/7 flex flex-col gap-3.5 rounded-[18px] p-6 ring-1">
          <h2 className="text-[18px] font-semibold">
            Where do the numbers come from?
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Google's Keyword Planner (free, inside Google Ads) shows the
            average monthly searches and a top-of-page bid for every keyword.
            Copy them in here so we can size each campaign before spending a
            dollar.
          </p>
        </div>
      }
    >
      {campaigns.isPending ? (
        <Skeleton className="h-64 w-full rounded-[18px]" />
      ) : campaigns.error ? (
        <p className="text-destructive text-[15px]">
          {campaigns.error.message}
        </p>
      ) : (
        <>
          {campaigns.data.length === 0 ? (
            <div className="bg-card ring-foreground/7 rounded-[18px] p-7 ring-1">
              <p className="text-muted-foreground text-[17px]">
                No keyword groups yet. Add one for each campaign you're
                planning, like "Online courses".
              </p>
            </div>
          ) : (
            <div className="bg-card ring-foreground/7 overflow-hidden rounded-[18px] shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
              {campaigns.data.map((campaign, i) => (
                <Link
                  key={campaign.id}
                  href={`${sectionUrl(repoId, "keywords")}/${campaign.id}`}
                  className={
                    i < campaigns.data.length - 1
                      ? "border-foreground/7 flex items-center gap-5 border-b px-6 py-5"
                      : "flex items-center gap-5 px-6 py-5"
                  }
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[19px] font-semibold">
                      {campaign.name}
                    </span>
                    <span className="text-muted-foreground text-[15px]">
                      {campaignSummary(campaign)}
                    </span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-5 shrink-0" />
                </Link>
              ))}
            </div>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  className="bg-foreground/5 hover:bg-foreground/8 self-start rounded-[11px] px-4.5 py-3 text-[16px]"
                />
              }
            >
              <Plus className="size-4" /> Add keyword group
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>New keyword group</DialogTitle>
              </DialogHeader>
              <Input
                value={name}
                placeholder="e.g. Online courses"
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim())
                    create.mutate({ repoId, name: name.trim() });
                }}
              />
              <DialogFooter>
                <Button
                  disabled={!name.trim() || create.isPending}
                  onClick={() => create.mutate({ repoId, name: name.trim() })}
                >
                  {create.isPending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </StepShell>
  );
}

const EMPTY_KEYWORD: AdCampaignKeyword = {
  text: "",
  avgMonthlySearches: "",
  maxCpc: "",
};

/** One keyword group's editor: name, niche and the keyword table. */
export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { repoId } = useAgency();

  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ repoId })
  );
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
    setRows(
      campaign.keywords.length > 0 ? campaign.keywords : [{ ...EMPTY_KEYWORD }]
    );
    setDirty(false);
  }, [campaign]);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.agency.campaigns.pathKey(),
    });

  const update = useMutation(
    trpc.agency.campaigns.update.mutationOptions({
      onSuccess: () => {
        setSavedAt(new Date());
        setDirty(false);
        invalidate();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    trpc.agency.campaigns.remove.mutationOptions({
      onSuccess: () => {
        invalidate();
        router.push(sectionUrl(repoId, "keywords"));
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const saveAnd = async (to?: string) => {
    if (!campaign || !name.trim()) return;
    try {
      await update.mutateAsync({
        repoId,
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
        <div className="ring-foreground/7 flex flex-col gap-3.5 rounded-[18px] p-6 ring-1">
          <h2 className="text-[18px] font-semibold">Reading the numbers</h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Avg. monthly searches tells you how many people look for this each
            month; max CPC is roughly what one click costs. High searches and a
            CPC you can afford make a keyword worth bidding on.
          </p>
        </div>
      }
    >
      {campaigns.isPending ? (
        <Skeleton className="h-64 w-full rounded-[18px]" />
      ) : campaigns.error ? (
        <p className="text-destructive text-[15px]">
          {campaigns.error.message}
        </p>
      ) : !campaign ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-[16px]">
            Keyword group not found.
          </p>
          <Link
            href={sectionUrl(repoId, "keywords")}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[15px] font-medium"
          >
            <ArrowLeft className="size-4" /> Keywords
          </Link>
        </div>
      ) : (
        <FrameCard innerClassName="flex flex-col gap-7 p-7">
          <Link
            href={sectionUrl(repoId, "keywords")}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-[15px] font-medium"
          >
            <ArrowLeft className="size-4" /> All keyword groups
          </Link>

          <div className="flex flex-col gap-2">
            <FieldHead
              htmlFor="catname"
              label="Group name"
              hint="One group = one campaign, e.g. Online courses."
            />
            <Input
              id="catname"
              value={name}
              className="h-auto max-w-md px-4 py-3.5 text-[17px]"
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FieldHead
              htmlFor="catniche"
              label="Niche"
              hint="The market this group competes in; it feeds the ad prompt."
            />
            <Input
              id="catniche"
              value={niche}
              placeholder="e.g. Websites for local service businesses"
              className="h-auto max-w-md px-4 py-3.5 text-[17px]"
              onChange={(e) => {
                setNiche(e.target.value);
                setDirty(true);
              }}
            />
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="text-muted-foreground grid grid-cols-[1fr_10rem_7rem_auto] items-center gap-2.5 pb-2 font-mono text-[13px] tracking-[0.04em] uppercase">
                <span>Keyword</span>
                <span>Avg. monthly searches</span>
                <span>Max CPC</span>
                <span className="w-9" />
              </div>
              <div className="flex flex-col gap-2.5">
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_10rem_7rem_auto] items-center gap-2.5"
                  >
                    <Input
                      aria-label={`Keyword ${i + 1}`}
                      value={row.text}
                      placeholder="e.g. best online marketing courses"
                      className="h-auto px-4 py-3 text-[16px]"
                      onChange={(e) => setRow(i, { text: e.target.value })}
                    />
                    <Input
                      aria-label={`Avg. monthly searches ${i + 1}`}
                      value={row.avgMonthlySearches}
                      placeholder="e.g. 50"
                      className="h-auto px-4 py-3 text-[16px]"
                      onChange={(e) =>
                        setRow(i, { avgMonthlySearches: e.target.value })
                      }
                    />
                    <Input
                      aria-label={`Max CPC ${i + 1}`}
                      value={row.maxCpc}
                      placeholder="e.g. 2.77"
                      className="h-auto px-4 py-3 text-[16px]"
                      onChange={(e) => setRow(i, { maxCpc: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove keyword ${i + 1}`}
                      className={rows.length > 1 ? "" : "invisible"}
                      onClick={() => {
                        setRows((prev) => prev.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="bg-foreground/5 hover:bg-foreground/8 rounded-[11px] px-4 text-[15px]"
              onClick={() => {
                setRows((prev) => [...prev, { ...EMPTY_KEYWORD }]);
                setDirty(true);
              }}
            >
              <Plus className="size-4" /> Add keyword
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive text-[15px]"
              disabled={remove.isPending}
              onClick={() => {
                if (confirm(`Delete "${campaign.name}" and its keywords?`))
                  remove.mutate({ repoId, id: campaign.id });
              }}
            >
              Delete group
            </Button>
          </div>
        </FrameCard>
      )}
    </StepShell>
  );
}
