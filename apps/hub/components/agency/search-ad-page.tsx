"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";
import type { AdCampaign } from "@workspace/drizzle/schema";

import {
  BUSINESS_SECTIONS,
  sectionUrl,
} from "@/components/agency/business-info-config";
import {
  FieldLabel,
  PromptCard,
} from "@/components/agency/business-info-page";
import { useAgency } from "@/components/agency/use-agency";
import { LineListEditor } from "@/components/line-list-editor";

const SECTION = BUSINESS_SECTIONS.find((s) => s.key === "search-ad")!;
const STORAGE_KEY = "search-ad-campaign";

type AdText = AdCampaign["adText"];

// One line-list per output; paste the whole generated block and each line
// becomes a value. maxLength mirrors Google's per-component limits (soft).
const OUTPUTS: { key: keyof AdText; label: string; maxLength: number; placeholder: string }[] = [
  { key: "headlines", label: "Headline", maxLength: 30, placeholder: "Paste the generated headlines, one per line." },
  { key: "descriptions", label: "Ad description", maxLength: 90, placeholder: "Paste the generated descriptions, one per line." },
  { key: "callouts", label: "Callout", maxLength: 25, placeholder: "Paste the generated callouts, one per line." },
];

function seedAdText(saved: AdText): AdText {
  return {
    headlines: [...saved.headlines],
    descriptions: [...saved.descriptions],
    callouts: [...saved.callouts],
  };
}

/** Search ad text: campaign-specific prompt + the kept ad copy. */
export function SearchAdPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();

  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ repoId }));
  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ repoId })
  );

  const [campaignId, setCampaignId] = useState("");
  const [adText, setAdText] = useState<AdText | null>(null);
  const [dirty, setDirty] = useState(false);

  // Default to the last campaign used on this device.
  useEffect(() => {
    if (!campaigns.data?.length || campaignId) return;
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable; fall back to the first campaign
    }
    const pick =
      campaigns.data.find((c) => c.id === remembered) ?? campaigns.data[0]!;
    setCampaignId(pick.id);
  }, [campaigns.data, campaignId]);

  const campaign = campaigns.data?.find((c) => c.id === campaignId);

  // (Re)seed the output lists when the selected campaign changes or reloads.
  useEffect(() => {
    setAdText(campaign ? seedAdText(campaign.adText) : null);
    setDirty(false);
  }, [campaign]);

  const save = useMutation(
    trpc.agency.campaigns.update.mutationOptions({
      onSuccess: () => {
        toast.success("Ad text saved.");
        setDirty(false);
        queryClient.invalidateQueries({
          queryKey: trpc.agency.campaigns.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // The campaign feeds the prompt through pseudo-keys next to the saved
  // business info, so PromptCard's fill/highlight/missing logic is unchanged.
  const values = useMemo(
    () => ({
      ...(info.data ?? {}),
      campaignKeywords: campaign?.keywords.map((k) => k.text) ?? [],
      campaignNiche: campaign?.niche ? [campaign.niche] : [],
    }),
    [info.data, campaign]
  );

  if (info.isPending || campaigns.isPending)
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  const error = info.error ?? campaigns.error;
  if (error)
    return <p className="text-destructive text-[14px]">{error.message}</p>;
  const campaignList = campaigns.data ?? [];

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

      {campaignList.length === 0 ? (
        <p className="text-muted-foreground max-w-2xl text-[13.5px]">
          No categories yet. Add one on the{" "}
          <Link
            href={sectionUrl("keywords")}
            className="text-foreground underline underline-offset-2"
          >
            Keywords
          </Link>{" "}
          page first — the prompt fills itself from the category you pick.
        </p>
      ) : (
        <>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select
              value={campaignId}
              onValueChange={(value) => {
                if (!value) return;
                setCampaignId(value);
                try {
                  localStorage.setItem(STORAGE_KEY, value);
                } catch {
                  // per-device convenience only
                }
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                {/* The raw value is the campaign id; show its name instead. */}
                <SelectValue placeholder="Pick a category">
                  {(value: string | null) =>
                    campaignList.find((c) => c.id === value)?.name ??
                    "Pick a category"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {campaignList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {SECTION.prompts?.map((prompt) => (
            <PromptCard
              key={prompt.title}
              prompt={prompt}
              values={values}
              // Missing category info links straight to the selected
              // category's page; no selection falls back to the index.
              links={{
                keywords: campaign
                  ? `${sectionUrl("keywords")}/${campaign.id}`
                  : sectionUrl("keywords"),
              }}
            />
          ))}

          {campaign && adText && (
            <>
              <div className="space-y-5">
                {OUTPUTS.map((output) => (
                  <div key={output.key}>
                    <FieldLabel>{output.label}s</FieldLabel>
                    <LineListEditor
                      values={adText[output.key]}
                      placeholder={output.placeholder}
                      maxLength={output.maxLength}
                      onChange={(lines) => {
                        setAdText((prev) =>
                          prev ? { ...prev, [output.key]: lines } : prev
                        );
                        setDirty(true);
                      }}
                    />
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                disabled={!dirty || save.isPending}
                onClick={() =>
                  save.mutate({ repoId, id: campaign.id, adText })
                }
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
