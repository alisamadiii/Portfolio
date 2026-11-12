"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { AdCampaign } from "@workspace/drizzle/schema";

import { sectionUrl, stepFor } from "@/components/agency/business-info-config";
import { AiHelper } from "@/components/agency/business-info/ai-helper";
import { StepShell } from "@/components/agency/business-info/step-shell";
import { useAgency } from "@/components/agency/use-agency";
import { Button, IconButton } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ds/ui/field";
import { Copy, Plus, X } from "@/components/icon";

const STEP = stepFor("search-ad")!;
const PROMPT = STEP.prompts![0]!;
const STORAGE_KEY = "search-ad-campaign";

type AdText = AdCampaign["adText"];
type OutputKey = keyof AdText;

const OUTPUTS: {
  key: OutputKey;
  title: string;
  max: number;
  min?: number;
  limit: number;
  seed: number;
  placeholder: (i: number) => string;
  multiline?: boolean;
}[] = [
  {
    key: "headlines",
    title: "Headlines",
    max: 15,
    min: 3,
    limit: 30,
    seed: 4,
    placeholder: (i) => (i === 3 ? "Headline 4 (optional)" : `Headline ${i + 1}`),
  },
  {
    key: "descriptions",
    title: "Descriptions",
    max: 4,
    min: 2,
    limit: 90,
    seed: 2,
    multiline: true,
    placeholder: (i) =>
      i === 0
        ? "Description 1: what you do and why it's worth the click"
        : i === 1
          ? "Description 2: proof, offer or next step"
          : `Description ${i + 1}`,
  },
  {
    key: "callouts",
    title: "Callouts",
    max: 10,
    limit: 25,
    seed: 0,
    placeholder: (i) => `Callout ${i + 1}`,
  },
];

/** Strip list decorations AI output carries: "1. ", "- ", quotes, **bold**. */
function cleanLine(line: string): string {
  let text = line.trim();
  text = text.replace(/^(\d+[.)]\s+|[-•*]\s+)/, "");
  text = text.replace(/^\*\*(.+)\*\*$/, "$1");
  text = text.replace(/^["'](.+)["']$/, "$1");
  return text.trim();
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function Counter({ length, limit }: { length: number; limit: number }) {
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        length > limit ? "text-danger" : length > limit - 3 ? "text-coral-deep" : "text-dim"
      )}
    >
      {length}/{limit}
    </span>
  );
}

function seedAdText(saved: AdText): AdText {
  const pad = (rows: string[], seed: number) =>
    rows.length >= seed
      ? [...rows]
      : [...rows, ...Array.from({ length: seed - rows.length }, () => "")];
  return {
    headlines: pad(saved.headlines, 4),
    descriptions: pad(saved.descriptions, 2),
    callouts: [...saved.callouts],
  };
}

export function StepSearchAd() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { projectId, websiteUrl } = useAgency();

  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ projectId }));
  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ projectId })
  );

  const [campaignId, setCampaignId] = useState("");
  const [adText, setAdText] = useState<AdText | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Default to the last keyword group used on this device.
  useEffect(() => {
    if (!campaigns.data?.length || campaignId) return;
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable; fall back to the first group
    }
    const pick =
      campaigns.data.find((c) => c.id === remembered) ?? campaigns.data[0]!;
    setCampaignId(pick.id);
  }, [campaigns.data, campaignId]);

  const campaign = campaigns.data?.find((c) => c.id === campaignId);

  useEffect(() => {
    setAdText(campaign ? seedAdText(campaign.adText) : null);
    setDirty(false);
  }, [campaign]);

  const save = useMutation(
    trpc.agency.campaigns.update.mutationOptions({
      onSuccess: () => {
        setSavedAt(new Date());
        setDirty(false);
        queryClient.invalidateQueries({
          queryKey: trpc.agency.campaigns.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const saveAnd = async (to?: string) => {
    if (!campaign || !adText) return;
    try {
      await save.mutateAsync({ projectId, id: campaign.id, adText });
      if (to) router.push(to);
    } catch {
      // onError toasted
    }
  };

  // The campaign feeds the prompt through pseudo-keys beside the saved map.
  const values = useMemo(
    () => ({
      ...(info.data ?? {}),
      campaignKeywords: campaign?.keywords.map((k) => k.text) ?? [],
      campaignNiche: campaign?.niche ? [campaign.niche] : [],
    }),
    [info.data, campaign]
  );

  const setLines = (key: OutputKey, lines: string[]) => {
    setAdText((prev) => (prev ? { ...prev, [key]: lines } : prev));
    setDirty(true);
  };

  const copyLine = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied."))
      .catch(() => toast.error("Couldn't copy."));
  };

  // Callout suggestion chips from step 1 features (25-char cap).
  const calloutSuggestions = (info.data?.features ?? [])
    .map((f) => titleCase(f.trim()))
    .filter(
      (f) =>
        f &&
        f.length <= 25 &&
        !(adText?.callouts ?? []).some(
          (c) => c.trim().toLowerCase() === f.toLowerCase()
        )
    )
    .slice(0, 6);

  const domain = websiteUrl
    ? websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : "yourwebsite.com";

  const loading = info.isPending || campaigns.isPending;
  const error = info.error ?? campaigns.error;
  const headlines = adText?.headlines ?? [];
  const descriptions = adText?.descriptions ?? [];

  return (
    <StepShell
      stepKey="search-ad"
      headerAside={
        !loading && (campaigns.data?.length ?? 0) > 0 ? (
          <Field label="Keyword group" className="w-full max-w-[320px]">
            <Select
              value={campaignId}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                setCampaignId(value);
                try {
                  localStorage.setItem(STORAGE_KEY, value);
                } catch {
                  // per-device convenience only
                }
              }}
            >
              {campaigns.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.keywords.length} keywords
                </option>
              ))}
            </Select>
          </Field>
        ) : undefined
      }
      footer={{ dirty, saving: save.isPending, savedAt, saveAnd }}
      aside={
        <>
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold">Live preview</span>
              <span className="text-xs text-dim">Mobile search</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-inner border border-divider bg-canvas p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-coral text-[13px] font-bold text-ink">
                  {domain[0]?.toUpperCase() ?? "A"}
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold">Sponsored</span>
                  <span className="text-xs text-dim">{domain}</span>
                </span>
              </div>
              <span className="text-[17px] leading-snug text-info-text">
                {[0, 1, 2].map((i) => (
                  <span key={i}>
                    {i > 0 && " | "}
                    {headlines[i]?.trim() ? headlines[i] : <span className="text-faint">Headline {i + 1}</span>}
                  </span>
                ))}
              </span>
              <span
                className={cn(
                  "text-[13px] leading-normal",
                  descriptions[0]?.trim() ? "text-ink-2" : "text-faint"
                )}
              >
                {descriptions[0]?.trim() ||
                  "Your first description shows here. Write at least two so Google can rotate them."}
              </span>
            </div>
            <span className="text-xs text-dim">
              Google picks which lines to show. This is one possible mix.
            </span>
          </Card>
          <AiHelper
            prompt={PROMPT}
            values={values}
            links={{
              keywords: campaign
                ? `${sectionUrl(projectId, "keywords")}/${campaign.id}`
                : sectionUrl(projectId, "keywords"),
            }}
          />
        </>
      }
    >
      {loading ? (
        <Skeleton className="h-96 w-full rounded-card" />
      ) : error ? (
        <p className="text-sm text-danger">{error.message}</p>
      ) : !campaign || !adText ? (
        <Card className="p-6">
          <p className="text-sm leading-relaxed text-dim">
            No keyword groups yet. Add one on the{" "}
            <Link href={sectionUrl(projectId, "keywords")} className="font-medium text-coral-text">
              Keywords
            </Link>{" "}
            step first; the prompt and the ad text are saved per group.
          </p>
        </Card>
      ) : (
        <>
          {OUTPUTS.map((output) => {
            const lines = adText[output.key];
            const filledCount = lines.filter((l) => l.trim()).length;
            return (
              <Card key={output.key} className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold">{output.title}</h2>
                  <span className="text-xs text-dim">
                    {filledCount} of {output.max}
                    {output.min ? ` · min ${output.min}` : ""} · {output.limit} chars each
                  </span>
                </div>

                {output.key === "callouts" && (
                  <>
                    <p className="text-[13px] text-dim">
                      Short extras shown under your ad. Pulled from your features in step 1, edit
                      freely.
                    </p>
                    {(calloutSuggestions.length > 0 ||
                      lines.length < output.max) && (
                      <div className="flex flex-wrap gap-2.5">
                        {calloutSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="inline-flex h-8 items-center gap-1.5 rounded-control border border-dashed border-line-strong px-3 text-[13px] hover:border-ink-3"
                            onClick={() =>
                              setLines(output.key, [
                                ...lines.filter((l) => l.trim()),
                                suggestion,
                              ])
                            }
                          >
                            <Plus className="size-4" /> {suggestion}
                          </button>
                        ))}
                        <Button variant="subtle" size="sm" onClick={() => setLines(output.key, [...lines, ""])}>
                          Write your own
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {lines.map((line, i) => (
                  <div key={i} className="group flex items-start gap-2">
                    {output.multiline ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <Textarea
                          aria-label={`${output.title.slice(0, -1)} ${i + 1}`}
                          rows={2}
                          value={line}
                          placeholder={output.placeholder(i)}
                          onChange={(e) =>
                            setLines(
                              output.key,
                              lines.map((l, j) => (j === i ? e.target.value : l))
                            )
                          }
                          onPaste={(e) => {
                            const text = e.clipboardData.getData("text/plain");
                            if (!text.includes("\n")) return;
                            e.preventDefault();
                            const pasted = text
                              .split("\n")
                              .map(cleanLine)
                              .filter(Boolean);
                            if (!pasted.length) return;
                            const next = [...lines];
                            next.splice(
                              i,
                              next[i]?.trim() ? 0 : 1,
                              ...pasted
                            );
                            setLines(output.key, next.slice(0, output.max));
                          }}
                        />
                        <span className="self-end">
                          <Counter length={line.length} limit={output.limit} />
                        </span>
                      </div>
                    ) : (
                      <div className="relative min-w-0 flex-1">
                        <Input
                          aria-label={`${output.title.slice(0, -1)} ${i + 1}`}
                          value={line}
                          placeholder={output.placeholder(i)}
                          className="pr-16"
                          onChange={(e) =>
                            setLines(
                              output.key,
                              lines.map((l, j) => (j === i ? e.target.value : l))
                            )
                          }
                          onPaste={(e) => {
                            const text = e.clipboardData.getData("text/plain");
                            if (!text.includes("\n")) return;
                            e.preventDefault();
                            const pasted = text
                              .split("\n")
                              .map(cleanLine)
                              .filter(Boolean);
                            if (!pasted.length) return;
                            const next = [...lines];
                            next.splice(
                              i,
                              next[i]?.trim() ? 0 : 1,
                              ...pasted
                            );
                            setLines(output.key, next.slice(0, output.max));
                          }}
                        />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2">
                          <Counter length={line.length} limit={output.limit} />
                        </span>
                      </div>
                    )}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      {line.trim() && (
                        <IconButton aria-label="Copy line" className="size-8" onClick={() => copyLine(line.trim())}>
                          <Copy className="size-4" />
                        </IconButton>
                      )}
                      <IconButton
                        aria-label="Remove line"
                        className="size-8"
                        onClick={() => setLines(output.key, lines.filter((_, j) => j !== i))}
                      >
                        <X className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                ))}

                {output.key !== "callouts" && lines.length < output.max && (
                  <Button
                    variant="subtle"
                    size="sm"
                    className="self-start"
                    icon={<Plus className="size-3.5" />}
                    onClick={() => setLines(output.key, [...lines, ""])}
                  >
                    Add {output.title.slice(0, -1).toLowerCase()}
                  </Button>
                )}
              </Card>
            );
          })}
        </>
      )}
    </StepShell>
  );
}
