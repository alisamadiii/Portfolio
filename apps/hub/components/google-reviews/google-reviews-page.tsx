"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ExternalLink, Eye, EyeOff, MapPin, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { AiPromptBlock, CopyBlock } from "@/components/agency/install-snippet";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor, ButtonLink } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { reviewsPrompt } from "@/lib/embed-prompts";
import { appPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

type Data = RouterOutputs["googleReviews"]["get"];
type Source = NonNullable<Data["source"]>;
type Review = RouterOutputs["googleReviews"]["list"]["items"][number];

const RATING_TABS = [
  { id: "all", label: "All" },
  { id: "5", label: "5 stars" },
  { id: "low", label: "1 to 4" },
] as const;
type RatingFilter = (typeof RATING_TABS)[number]["id"];

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.alisamadii.com").replace(/\/$/, "");

/** The listing lives in Settings; every "change" goes there. */
const settingsHref = `${appPath("settings")}#google-listing`;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("size-3.5", n <= rating ? "fill-coral text-coral" : "text-line-strong")}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** Google Reviews app: every Google review saved daily; the 5-star ones show on the website. */
export function GoogleReviewsPage() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const status = useQuery(trpc.googleReviews.get.queryOptions({ projectId }));

  const header = (
    <PageHeader
      title="Google Reviews"
      description="Your Google reviews, checked every day. The 5-star ones with a written review show on your website."
      docs="client-hub/google-reviews"
    />
  );

  if (status.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[240px] rounded-card" />
      </div>
    );
  }
  if (status.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<Star className="size-5" />}
            title="Couldn't load Google Reviews"
            text={handleCmsError(status.error, "Try again in a moment.")}
          />
        </Card>
      </div>
    );
  }

  const data = status.data;
  return (
    <div className="flex flex-col gap-6">
      {header}
      {!data.placeId ? (
        <ListingRequired projectId={projectId} />
      ) : !data.source ? (
        <ConnectCard data={data} />
      ) : (
        <>
          <ListingCard data={data} source={data.source} />
          <KpiGrid
            items={[
              { label: "Google rating", value: data.source.rating != null ? `${data.source.rating.toFixed(1)} / 5` : "—" },
              { label: "Reviews on Google", value: data.source.totalReviews != null ? String(data.source.totalReviews) : "—" },
              { label: "Saved here", value: String(data.saved), sub: `${data.visible} on your website` },
              {
                label: "Last checked",
                value: data.source.lastSyncedAt
                  ? formatDistanceToNow(parseISO(data.source.lastSyncedAt), { addSuffix: true })
                  : "—",
              },
            ]}
          />
          <ReviewsTable />
          <InstallCard />
        </>
      )}
    </div>
  );
}

function useConnect(onDone?: () => void) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.googleReviews.connect.mutationOptions({
      onSuccess: ({ added }) => {
        toast.success(added ? `Connected. ${added} reviews saved.` : "Connected. No reviews yet.");
        void queryClient.invalidateQueries({ queryKey: trpc.googleReviews.pathKey() });
        onDone?.();
      },
      onError: (error) => {
        toast.error(error.message);
        void queryClient.invalidateQueries({ queryKey: trpc.googleReviews.pathKey() });
      },
    })
  );
}

/** No Google listing in Settings yet: nothing to sync. */
function ListingRequired({ projectId }: { projectId: string }) {
  return (
    <Card>
      <EmptyState
        icon={<MapPin className="size-5" />}
        title="Add your Google listing first"
        text="We read reviews from your business on Google Maps. Find it under Google listing in Settings, then come back here."
        action={
          <ButtonLink variant="primary" href={settingsHref}>
            Open Settings
          </ButtonLink>
        }
      />
    </Card>
  );
}

/** The listing from Settings (name, address) with a way to change it there. */
function Listing({ data }: { data: Data }) {
  const projectId = useProjectId();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-inner border border-line px-4 py-3">
      <MapPin className="size-4 shrink-0 text-dim" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">{data.businessName || "Your listing"}</span>
        {data.address && <span className="truncate text-[13px] text-dim">{data.address}</span>}
      </div>
      <ButtonLink size="sm" variant="outline" href={settingsHref}>
        Change in Settings
      </ButtonLink>
    </div>
  );
}

function ConnectCard({ data }: { data: Data }) {
  const projectId = useProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const connect = useConnect();

  return (
    <Card>
      <CardHeader title="Start syncing your reviews" divided />
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-dim">
          We save the 50 newest reviews from your Google listing now, then add new ones every day.
        </p>
        <Listing data={data} />
        {fullAccess ? (
          <div>
            <Button variant="primary" disabled={connect.isPending} onClick={() => connect.mutate({ projectId })}>
              {connect.isPending ? "Reading reviews…" : "Start syncing"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-dim">Ask the site owner to start syncing reviews.</p>
        )}
      </div>
    </Card>
  );
}

function ListingCard({ data, source }: { data: Data; source: Source }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [disconnecting, setDisconnecting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.googleReviews.pathKey() });
  const sync = useMutation(
    trpc.googleReviews.syncNow.mutationOptions({
      onSuccess: ({ added }) => {
        toast.success(added ? `${added} new reviews saved.` : "Up to date. No new reviews.");
        void invalidate();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const disconnect = useMutation(
    trpc.googleReviews.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Review syncing stopped.");
        void invalidate();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Card>
      <CardHeader
        title="Your Google listing"
        divided
        action={
          fullAccess && (
            <Button
              size="sm"
              icon={<RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} />}
              disabled={sync.isPending}
              onClick={() => sync.mutate({ projectId })}
            >
              {sync.isPending ? "Syncing…" : "Sync now"}
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-4 p-6 text-sm">
        <Listing data={data} />
        <p className="text-dim">
          New reviews are added automatically every morning around 6 AM Eastern. Sync now is only for checking right away.
        </p>
        {source.lastError && (
          <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-dim">
            The last check didn&apos;t finish. We&apos;ll try again tomorrow, or press Sync now.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <ButtonAnchor href={source.url} target="_blank" rel="noopener noreferrer" icon={<ExternalLink className="size-4" />}>
            Open on Google Maps
          </ButtonAnchor>
          {source.writeReviewUrl && (
            <ButtonAnchor href={source.writeReviewUrl} target="_blank" rel="noopener noreferrer" icon={<Star className="size-4" />}>
              Review link
            </ButtonAnchor>
          )}
        </div>
        {fullAccess && (
          <button
            type="button"
            className="self-start text-[13px] text-dim hover:text-ink hover:underline"
            onClick={() => setDisconnecting(true)}
          >
            Stop syncing and delete saved reviews
          </button>
        )}
      </div>
      <ConfirmDialog
        open={disconnecting}
        onOpenChange={setDisconnecting}
        title="Stop syncing reviews?"
        description="Every saved review is deleted and your website stops showing them. Your Google listing stays in Settings. This can't be undone."
        confirmLabel="Stop syncing"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
    </Card>
  );
}

function ReviewsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [rating, setRating] = useState<RatingFilter>("all");
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);

  const list = useQuery({
    ...trpc.googleReviews.list.queryOptions({ projectId, rating, cursor }),
    placeholderData: keepPreviousData,
  });
  const setHidden = useMutation(
    trpc.googleReviews.setHidden.mutationOptions({
      onSuccess: (_, vars) => {
        toast.success(vars.hidden ? "Hidden from your website." : "Showing on your website.");
        void queryClient.invalidateQueries({ queryKey: trpc.googleReviews.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const columns: Column<Review>[] = [
    {
      key: "author",
      header: "Reviewer",
      width: "minmax(160px, 1fr)",
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-3 py-3">
          {r.authorPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.authorPhotoUrl} alt="" className="size-8 shrink-0 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-ink">
              {r.authorName.charAt(0)}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-ink">{r.authorName}</span>
            <Stars rating={r.rating} />
          </div>
        </div>
      ),
    },
    {
      key: "text",
      header: "Review",
      width: "minmax(260px, 2.5fr)",
      cell: (r) => (
        <div className="flex flex-col items-start gap-1.5 py-3">
          {r.text ? (
            <p className="line-clamp-4 whitespace-pre-wrap text-ink">{r.text}</p>
          ) : (
            <span className="text-faint">Rating only</span>
          )}
          {r.onWebsite ? (
            <Badge tone="success">On website</Badge>
          ) : r.hidden ? (
            <Badge tone="neutral">Hidden from website</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "date",
      header: "Posted",
      width: "120px",
      cell: (r) =>
        r.reviewUrl ? (
          <a href={r.reviewUrl} target="_blank" rel="noopener noreferrer" className="text-coral-text hover:underline">
            {format(parseISO(r.publishedAt), "MMM d, yyyy")}
          </a>
        ) : (
          format(parseISO(r.publishedAt), "MMM d, yyyy")
        ),
    },
    ...(fullAccess
      ? [
          {
            key: "actions",
            header: "",
            width: "48px",
            align: "end" as const,
            cell: (r: Review) =>
              r.rating === 5 && r.text ? (
              <button
                type="button"
                aria-label={r.hidden ? "Show on website" : "Hide from website"}
                title={r.hidden ? "Show on website" : "Hide from website"}
                className="rounded-control p-1.5 text-dim hover:bg-subtle hover:text-ink"
                disabled={setHidden.isPending}
                onClick={() => setHidden.mutate({ projectId, id: r.id, hidden: !r.hidden })}
              >
                {r.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader
        title="Saved reviews"
        divided
        action={
          <SegmentedTabs
            label="Filter by rating"
            items={RATING_TABS.map((t) => ({ id: t.id, label: t.label }))}
            value={rating}
            onChange={(id) => {
              setRating(id as RatingFilter);
              setCursors([]);
            }}
          />
        }
      />
      {list.isPending ? (
        <div className="p-6">
          <Skeleton className="h-[180px] rounded-card" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          rowKey={(r) => r.id}
          minWidth={720}
          empty={
            <EmptyState
              icon={<Star className="size-5" />}
              title={rating === "all" ? "No reviews yet" : "No reviews with this rating"}
              text="New Google reviews show up here the day after they're posted."
            />
          }
        />
      )}
      {(cursors.length > 0 || list.data?.nextCursor) && (
        <div className="flex justify-end gap-2 border-t border-divider px-6 py-3">
          <Button size="sm" disabled={cursors.length === 0} onClick={() => setCursors((c) => c.slice(0, -1))}>
            Newer
          </Button>
          <Button
            size="sm"
            disabled={!list.data?.nextCursor}
            onClick={() => list.data?.nextCursor && setCursors((c) => [...c, list.data!.nextCursor!])}
          >
            Older
          </Button>
        </div>
      )}
    </Card>
  );
}

const EXAMPLE_MARKUP = `<p><span data-reviews-rating></span> stars from <span data-reviews-count></span> Google reviews</p>
<div class="reviews">
  <template data-review-template>
    <figure>
      <span data-review="stars"></span>
      <p data-review="text"></p>
      <figcaption><span data-review="author"></span>, <time data-review="date"></time></figcaption>
    </figure>
  </template>
</div>
<a data-reviews-write>Leave us a review</a>`;

// For whoever maintains the site's code: one tag + plain markup, no keys.
function InstallCard() {
  const projectId = useProjectId();
  const snippet = `<script src="${API_URL}/reviews.js" data-key="${projectId}" defer></script>`;
  return (
    <Card className="text-sm">
      <CardHeader title="Show reviews on your website" divided />
      <div className="space-y-3 px-6 py-5">
        <p className="text-dim">
          <span className="font-medium text-ink">1. Add this tag to the page.</span> It only works on your
          own website&apos;s domains.
        </p>
        <CopyBlock code={snippet} />
        <p className="text-dim">
          <span className="font-medium text-ink">2. Mark where reviews go.</span> Each review is a copy of
          the template, styled however you like.
        </p>
        <CopyBlock code={EXAMPLE_MARKUP} />
        <p className="text-dim">
          Other fields: <code>data-review=&quot;photo&quot;</code> on an <code>&lt;img&gt;</code>,{" "}
          <code>data-review=&quot;reply&quot;</code> for your reply, <code>data-review=&quot;link&quot;</code> on
          an <code>&lt;a&gt;</code> to the review on Google. <code>data-limit=&quot;6&quot;</code> on the script
          loads fewer reviews.
        </p>
        <AiPromptBlock prompt={reviewsPrompt({ apiUrl: API_URL, projectId })} />
      </div>
    </Card>
  );
}
