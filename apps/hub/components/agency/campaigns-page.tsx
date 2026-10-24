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
import type { AdCampaignKeyword } from "@workspace/drizzle/schema";

import {
  BUSINESS_SECTIONS,
  sectionUrl,
} from "@/components/agency/business-info-config";
import { useAgency } from "@/components/agency/use-agency";
import { ArrowLeft, Plus, Trash } from "@/components/icon";

const SECTION = BUSINESS_SECTIONS.find((s) => s.key === "keywords")!;

/** The Keywords page: one card per category (= one planned campaign). */
export function CampaignsIndex() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { repoId } = useAgency();

  const campaigns = useQuery(trpc.agency.campaigns.list.queryOptions({ repoId }));
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
        router.push(`${sectionUrl("keywords")}/${campaign.id}`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-muted-foreground/70 font-mono text-[12px] font-semibold">
          {SECTION.num}
        </p>
        <h3 className="mt-1 text-[19px] font-bold tracking-tight">
          {SECTION.title}
        </h3>
        <p className="text-muted-foreground mt-1 max-w-2xl text-[14px]">
          {SECTION.lead}
        </p>
        {SECTION.description?.map((paragraph, i) => (
          <p
            key={i}
            className="text-muted-foreground/90 mt-3 max-w-2xl text-[13.5px] leading-relaxed"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {campaigns.isPending ? (
        <Skeleton className="h-32 w-full max-w-2xl rounded-2xl" />
      ) : campaigns.error ? (
        <p className="text-destructive text-[14px]">{campaigns.error.message}</p>
      ) : (
        <div className="max-w-2xl space-y-3">
          {campaigns.data.length === 0 && (
            <p className="text-muted-foreground text-[13.5px]">
              No categories yet. Add one for each campaign you're planning.
            </p>
          )}
          {campaigns.data.map((campaign) => (
            <Link
              key={campaign.id}
              href={`${sectionUrl("keywords")}/${campaign.id}`}
              className="bg-card hover:border-foreground/25 block rounded-2xl border p-4 transition-colors"
            >
              <p className="text-[15px] font-semibold">{campaign.name}</p>
              <p className="text-muted-foreground mt-0.5 text-[13px]">
                {campaign.keywords.length}{" "}
                {campaign.keywords.length === 1 ? "keyword" : "keywords"}
                {campaign.niche && <> · {campaign.niche}</>}
              </p>
            </Link>
          ))}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              <Plus className="size-4" /> Add category
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>New category</DialogTitle>
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
        </div>
      )}
    </div>
  );
}

const EMPTY_KEYWORD: AdCampaignKeyword = {
  text: "",
  avgMonthlySearches: "",
  maxCpc: "",
};

/** One category's page: name, niche, and the keyword table. */
export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { repoId } = useAgency();

  const campaigns = useQuery(trpc.agency.campaigns.list.queryOptions({ repoId }));
  const campaign = campaigns.data?.find((c) => c.id === campaignId);

  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [rows, setRows] = useState<AdCampaignKeyword[]>([]);
  const [dirty, setDirty] = useState(false);

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
    queryClient.invalidateQueries({ queryKey: trpc.agency.campaigns.pathKey() });

  const update = useMutation(
    trpc.agency.campaigns.update.mutationOptions({
      onSuccess: () => {
        toast.success("Category saved.");
        invalidate();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    trpc.agency.campaigns.remove.mutationOptions({
      onSuccess: () => {
        invalidate();
        router.push(sectionUrl("keywords"));
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (campaigns.isPending)
    return <Skeleton className="h-64 w-full max-w-2xl rounded-2xl" />;
  if (campaigns.error)
    return (
      <p className="text-destructive text-[14px]">{campaigns.error.message}</p>
    );
  if (!campaign)
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-[14px]">Category not found.</p>
        <BackLink />
      </div>
    );

  const setRow = (i: number, patch: Partial<AdCampaignKeyword>) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <BackLink />

      <div className="space-y-4">
        <div>
          <p className="text-foreground/80 mb-1.5 text-[13px] font-medium">
            Category name
          </p>
          <Input
            value={name}
            className="max-w-md"
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <div>
          <p className="text-foreground/80 mb-1.5 text-[13px] font-medium">
            Niche
          </p>
          <Input
            value={niche}
            placeholder="e.g. Websites for local service businesses"
            className="max-w-md"
            onChange={(e) => {
              setNiche(e.target.value);
              setDirty(true);
            }}
          />
        </div>
      </div>

      <div>
        <div className="text-muted-foreground grid grid-cols-[1fr_9rem_6.5rem_auto] items-center gap-2 pb-1.5 text-[12px] font-semibold tracking-[0.04em] uppercase">
          <span>Keyword</span>
          <span>Avg. monthly searches</span>
          <span>Max CPC</span>
          <span className="w-7" />
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_9rem_6.5rem_auto] items-center gap-2"
            >
              <Input
                value={row.text}
                placeholder="e.g. best online marketing courses"
                onChange={(e) => setRow(i, { text: e.target.value })}
              />
              <Input
                value={row.avgMonthlySearches}
                placeholder="e.g. 50"
                onChange={(e) =>
                  setRow(i, { avgMonthlySearches: e.target.value })
                }
              />
              <Input
                value={row.maxCpc}
                placeholder="e.g. 2.77"
                onChange={(e) => setRow(i, { maxCpc: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className={rows.length > 1 ? "" : "invisible"}
                onClick={() => {
                  setRows((prev) => prev.filter((_, j) => j !== i));
                  setDirty(true);
                }}
              >
                <Trash className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRows((prev) => [...prev, { ...EMPTY_KEYWORD }]);
              setDirty(true);
            }}
          >
            <Plus className="size-4" /> Add keyword
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="lg"
          disabled={!dirty || !name.trim() || update.isPending}
          onClick={() =>
            update.mutate({
              repoId,
              id: campaign.id,
              name: name.trim(),
              niche: niche.trim(),
              keywords: rows,
            })
          }
        >
          {update.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={remove.isPending}
          onClick={() => {
            if (confirm(`Delete "${campaign.name}" and its keywords?`))
              remove.mutate({ repoId, id: campaign.id });
          }}
        >
          Delete category
        </Button>
      </div>
    </div>
  );
}

const BackLink = () => (
  <Link
    href={sectionUrl("keywords")}
    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] font-medium"
  >
    <ArrowLeft className="size-3.5" /> Keywords
  </Link>
);
