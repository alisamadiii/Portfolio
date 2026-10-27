"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { AdCampaign } from "@workspace/drizzle/schema";

import { sectionUrl, stepFor } from "@/components/agency/business-info-config";
import { AiHelper } from "@/components/agency/business-info/ai-helper";
import {
  Eyebrow,
  FrameCard,
  StepShell,
} from "@/components/agency/business-info/step-shell";
import { useAgency } from "@/components/agency/use-agency";
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
        "font-mono text-[13px] tabular-nums",
        length > limit
          ? "text-destructive"
          : length > limit - 3
            ? "text-[#8a5a0a]"
            : "text-muted-foreground"
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
  const { repoId, websiteUrl } = useAgency();

  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ repoId }));
  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ repoId })
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
      await save.mutateAsync({ repoId, id: campaign.id, adText });
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
          <div className="flex w-full max-w-[320px] flex-col gap-2">
            <label className="text-[15px] font-semibold" htmlFor="group">
              Keyword group
            </label>
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
              <SelectTrigger id="group" className="h-auto w-full px-4 py-3 text-[16px]">
                <SelectValue placeholder="Pick a keyword group">
                  {(value: string | null) => {
                    const picked = campaigns.data?.find((c) => c.id === value);
                    return picked
                      ? `${picked.name} · ${picked.keywords.length} keywords`
                      : "Pick a keyword group";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {campaigns.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.keywords.length} keywords
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : undefined
      }
      footer={{ dirty, saving: save.isPending, savedAt, saveAnd }}
      aside={
        <>
          <FrameCard innerClassName="flex flex-col gap-4 p-6 shadow-[0_14px_34px_rgba(27,26,23,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Live preview</Eyebrow>
              <span className="text-muted-foreground text-[14px]">
                Mobile search
              </span>
            </div>
            <div className="bg-shell flex flex-col gap-2 rounded-[11px] p-4.5">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-[14px] font-extrabold">
                  {domain[0]?.toUpperCase() ?? "A"}
                </span>
                <span className="flex flex-col">
                  <span className="text-[14px] font-semibold">Sponsored</span>
                  <span className="text-muted-foreground text-[13px]">
                    {domain}
                  </span>
                </span>
              </div>
              <span className="text-[20px] leading-snug text-[#2d5e7a]">
                {[0, 1, 2].map((i) => (
                  <span key={i}>
                    {i > 0 && " | "}
                    {headlines[i]?.trim() ? (
                      headlines[i]
                    ) : (
                      <span className="text-muted-foreground/70">
                        Headline {i + 1}
                      </span>
                    )}
                  </span>
                ))}
              </span>
              <span
                className={cn(
                  "text-[15px] leading-normal",
                  descriptions[0]?.trim()
                    ? "text-foreground/80"
                    : "text-muted-foreground/70"
                )}
              >
                {descriptions[0]?.trim() ||
                  "Your first description shows here. Write at least two so Google can rotate them."}
              </span>
            </div>
            <span className="text-muted-foreground text-[14px]">
              Google picks which lines to show. This is one possible mix.
            </span>
          </FrameCard>
          <AiHelper
            prompt={PROMPT}
            values={values}
            links={{
              keywords: campaign
                ? `${sectionUrl(repoId, "keywords")}/${campaign.id}`
                : sectionUrl(repoId, "keywords"),
            }}
          />
        </>
      }
    >
      {loading ? (
        <Skeleton className="h-96 w-full rounded-[18px]" />
      ) : error ? (
        <p className="text-destructive text-[15px]">{error.message}</p>
      ) : !campaign || !adText ? (
        <div className="bg-card ring-foreground/7 rounded-[18px] p-7 ring-1">
          <p className="text-muted-foreground text-[17px] leading-relaxed">
            No keyword groups yet. Add one on the{" "}
            <Link
              href={sectionUrl(repoId, "keywords")}
              className="text-foreground underline underline-offset-2"
            >
              Keywords
            </Link>{" "}
            step first; the prompt and the ad text are saved per group.
          </p>
        </div>
      ) : (
        <>
          {OUTPUTS.map((output) => {
            const lines = adText[output.key];
            const filledCount = lines.filter((l) => l.trim()).length;
            return (
              <section
                key={output.key}
                className="bg-card ring-foreground/7 flex flex-col gap-4 rounded-[18px] p-7 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
                    {output.title}
                  </h2>
                  <span className="text-muted-foreground font-mono text-[14px]">
                    {filledCount} of {output.max}
                    {output.min ? ` · min ${output.min}` : ""} · {output.limit}{" "}
                    chars each
                  </span>
                </div>

                {output.key === "callouts" && (
                  <>
                    <p className="text-muted-foreground text-[15px]">
                      Short extras shown under your ad. Pulled from your
                      features in step 1, edit freely.
                    </p>
                    {(calloutSuggestions.length > 0 ||
                      lines.length < output.max) && (
                      <div className="flex flex-wrap gap-2.5">
                        {calloutSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="border-foreground/25 hover:border-foreground/50 inline-flex items-center gap-2 rounded-full border border-dashed px-3.5 py-2.5 text-[15px]"
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
                        <button
                          type="button"
                          className="bg-foreground/5 hover:bg-foreground/8 inline-flex items-center rounded-full px-3.5 py-2.5 text-[15px] font-medium"
                          onClick={() => setLines(output.key, [...lines, ""])}
                        >
                          Write your own
                        </button>
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
                          className="px-4 py-3.5 text-[17px] leading-normal"
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
                          className="h-auto px-4 py-3.5 pr-18 text-[17px]"
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
                        <span className="absolute top-1/2 right-4 -translate-y-1/2">
                          <Counter length={line.length} limit={output.limit} />
                        </span>
                      </div>
                    )}
                    <div className="flex shrink-0 items-center gap-0.5 pt-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      {line.trim() && (
                        <button
                          type="button"
                          aria-label="Copy line"
                          className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-[9px]"
                          onClick={() => copyLine(line.trim())}
                        >
                          <Copy className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Remove line"
                        className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-[9px]"
                        onClick={() =>
                          setLines(
                            output.key,
                            lines.filter((_, j) => j !== i)
                          )
                        }
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {output.key !== "callouts" && lines.length < output.max && (
                  <button
                    type="button"
                    className="bg-foreground/5 hover:bg-foreground/8 inline-flex items-center gap-2 self-start rounded-[11px] px-4 py-2.5 text-[15px] font-medium"
                    onClick={() => setLines(output.key, [...lines, ""])}
                  >
                    <Plus className="size-4" /> Add{" "}
                    {output.title.slice(0, -1).toLowerCase()}
                  </button>
                )}
              </section>
            );
          })}
        </>
      )}
    </StepShell>
  );
}
