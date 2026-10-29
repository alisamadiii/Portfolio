"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import {
  STARTER_NEGATIVE_LISTS,
  type NegativeListKey,
  type StarterNegativeList,
} from "@workspace/trpc/lib/agency/negative-lists";

import { Eyebrow, FrameCard } from "@/components/agency/page-shell";
import { StatusPill } from "@/components/agency/lead-status";
import { Check } from "@/components/icon";
import { useAgency } from "@/components/agency/use-agency";

// A keyword chip, playbook style: phrase-match words render with quotes.
const chipText = (word: StarterNegativeList["words"][number]) =>
  word.matchType === "PHRASE" ? `"${word.text}"` : word.text;

/**
 * Curated negative keyword lists from the playbook. One click saves a list
 * into Google Ads as a shared negative keyword set on every enabled Search
 * campaign. Universal lists show for everyone; the industry list only for
 * clients with that industry set (admin > agency clients).
 */
export function StarterNegativeLists() {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const [tab, setTab] = useState<NegativeListKey>("jobs");
  const [confirming, setConfirming] = useState<StarterNegativeList | null>(
    null
  );

  const meta = useQuery(
    trpc.agency.ads.negativeLists.list.queryOptions({ projectId })
  );

  const visible = STARTER_NEGATIVE_LISTS.filter(
    (list) => !list.industry || list.industry === meta.data?.industry
  );
  // Fall back when the active tab isn't visible (industry changed).
  const active = visible.find((list) => list.key === tab) ?? visible[0]!;
  const applied = new Set(meta.data?.applied ?? []);

  return (
    <FrameCard>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Eyebrow>Starter negative lists</Eyebrow>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
            Block the searches that never become customers
          </h2>
          <p className="text-muted-foreground max-w-[680px] text-[15px] leading-relaxed">
            Job seekers, DIYers and bargain hunters click ads too. One click
            saves a list into Google Ads as a shared negative keyword set on
            every Search campaign.
          </p>
        </div>

        {meta.isPending ? (
          <Skeleton className="h-48 w-full rounded-[14px]" />
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {visible.map((list) => (
                <Button
                  key={list.key}
                  type="button"
                  size="sm"
                  variant={list.key === active.key ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => setTab(list.key)}
                >
                  {list.label}
                  {applied.has(list.key) && <Check className="size-3.5" />}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {active.words.map((word) => (
                <StatusPill
                  key={word.text + word.matchType}
                  tone="danger"
                  dot={false}
                  className="font-mono font-normal"
                >
                  {chipText(word)}
                </StatusPill>
              ))}
              {active.keep.map((word) => (
                <StatusPill
                  key={word}
                  tone="success"
                  dot={false}
                  className="font-mono font-normal"
                >
                  keep: {word}
                </StatusPill>
              ))}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-[60ch] flex-col gap-1">
                <p className="text-muted-foreground text-[14px]">
                  {active.note}
                </p>
                {active.keep.length > 0 && (
                  <p className="text-muted-foreground text-[14px]">
                    Green words are buyers. They are shown as a warning and
                    never saved to Google Ads.
                  </p>
                )}
              </div>
              {applied.has(active.key) ? (
                <StatusPill tone="success">In Google Ads</StatusPill>
              ) : meta.data?.adsConnected && meta.data.canManage ? (
                <Button
                  type="button"
                  className="shrink-0"
                  onClick={() => setConfirming(active)}
                >
                  Apply list
                </Button>
              ) : !meta.data?.adsConnected ? (
                <p className="text-muted-foreground text-[14px]">
                  Link a Google Ads account to apply this list.
                </p>
              ) : null}
            </div>
          </>
        )}

        <p className="border-foreground/7 text-muted-foreground border-t pt-4 text-[14px]">
          <span className="text-foreground font-semibold">Golden rule:</span>{" "}
          never add a negative from imagination. &ldquo;Free estimate&rdquo; and
          &ldquo;price&rdquo; often come from buyers. Start with the obvious
          list, then let real search terms guide you.
        </p>
      </div>

      <AlertDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        {confirming && (
          <ApplyDialogContent
            list={confirming}
            onDone={() => setConfirming(null)}
          />
        )}
      </AlertDialog>
    </FrameCard>
  );
}

function ApplyDialogContent({
  list,
  onDone,
}: {
  list: StarterNegativeList;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useAgency();

  const apply = useMutation(
    trpc.agency.ads.negativeLists.applyList.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Saved ${data.keywords} negative keywords to ${data.attachedCampaigns} ${
            data.attachedCampaigns === 1 ? "campaign" : "campaigns"
          }.`
        );
        onDone();
        queryClient.invalidateQueries({
          queryKey: trpc.agency.ads.negativeLists.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Apply &ldquo;{list.label}&rdquo; to Google Ads?
        </AlertDialogTitle>
        <AlertDialogDescription>
          Saves {list.words.length} negative keywords as the shared list
          &ldquo;{list.sharedSetName}&rdquo; and attaches it to every Search
          campaign. Your ads stop showing for these searches. You can edit the
          list later in Google Ads under Shared library.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
        {list.words.map((word) => (
          <StatusPill
            key={word.text + word.matchType}
            tone="danger"
            dot={false}
            className="font-mono font-normal"
          >
            {chipText(word)}
          </StatusPill>
        ))}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={apply.isPending}
          onClick={(event) => {
            event.preventDefault();
            apply.mutate({ projectId, listKey: list.key });
          }}
        >
          {apply.isPending && <Spinner />}
          Apply list
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
