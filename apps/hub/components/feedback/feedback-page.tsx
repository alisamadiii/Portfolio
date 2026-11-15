"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Building2, Check, Copy, ExternalLink, MapPin, MessageSquare, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { REVIEW_FIELD_LABELS } from "@workspace/trpc/lib/review-link-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor, ButtonLink } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Input } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { repoPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

type Status = RouterOutputs["feedback"]["status"];
type Entry = RouterOutputs["feedback"]["list"]["items"][number];

const RATING_TABS = [
  { id: "all", label: "All" },
  { id: "5", label: "5 stars" },
  { id: "4", label: "4" },
  { id: "3", label: "3" },
  { id: "low", label: "1 to 2" },
] as const;
type RatingFilter = (typeof RATING_TABS)[number]["id"];

const businessInfoHref = (projectId: string) =>
  `${repoPath(projectId, "business-info", "business")}?from=feedback`;

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

/** Feedback app: one review link, 5 stars to Google, the rest private feedback. */
export function FeedbackPage() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();

  // Always refetch: the user may have just finished Business info.
  const status = useQuery({
    ...trpc.feedback.status.queryOptions({ projectId }),
    refetchOnMount: "always",
  });

  const header = (
    <PageHeader
      title="Feedback"
      description="Share one link with your customers. Happy customers are asked to review you on Google, everyone else can tell you privately."
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
            icon={<MessageSquare className="size-5" />}
            title="Couldn't load Feedback"
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
      {!data.ready ? (
        <BusinessInfoRequired projectId={projectId} missing={data.missing} />
      ) : !data.link ? (
        <PlaceSearch status={data} />
      ) : !data.link.googleUrl ? (
        <GoogleLinkRequired status={data} link={data.link} />
      ) : (
        <>
          <LinkCard status={data} link={data.link} />
          <Stats />
          <FeedbackTable />
        </>
      )}
    </div>
  );
}

function BusinessInfoRequired({
  projectId,
  missing,
}: {
  projectId: string;
  missing: Status["missing"];
}) {
  return (
    <Card>
      <EmptyState
        icon={<Building2 className="size-5" />}
        title="Finish your business info first"
        text={`Your review page shows your business details. Add your ${missing
          .map((f) => REVIEW_FIELD_LABELS[f].toLowerCase())
          .join(" and ")} in Business info, then come back here.`}
        action={
          <ButtonLink variant="primary" href={businessInfoHref(projectId)}>
            Add business info
          </ButtonLink>
        }
      />
    </Card>
  );
}

function PlaceSearch({ status, onDone }: { status: Status; onDone?: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [query, setQuery] = useState(status.defaultQuery);

  const search = useMutation(
    trpc.feedback.search.mutationOptions({
      onError: (error) => toast.error(error.message),
    })
  );
  const setPlace = useMutation(
    trpc.feedback.setPlace.mutationOptions({
      onSuccess: () => {
        toast.success("Business saved.");
        void queryClient.invalidateQueries({ queryKey: trpc.feedback.pathKey() });
        onDone?.();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (!fullAccess) {
    return (
      <Card>
        <EmptyState
          icon={<MapPin className="size-5" />}
          title="No review link yet"
          text="Ask the site owner to find the business on Google Maps to create the review link."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Find your business on Google Maps" divided />
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-dim">
          We send 5-star customers to your Google review page. Search your business name as it appears on Google, then pick your business listing (not your street address).
        </p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim().length >= 2) search.mutate({ projectId, query: query.trim() });
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Your business name as it appears on Google"
            className="min-w-[240px] flex-1"
            aria-label="Business name and city"
          />
          <Button
            type="submit"
            variant="dark"
            icon={<Search className="size-4" />}
            disabled={search.isPending || query.trim().length < 2}
          >
            {search.isPending ? "Searching…" : "Search"}
          </Button>
        </form>

        {search.data && search.data.length === 0 && (
          <p className="text-sm text-dim">
            No Google business found. Search the exact name shown on Google Maps, plus your city.
          </p>
        )}
        {search.data && search.data.length > 0 && (
          <ul className="divide-y divide-divider overflow-hidden rounded-card border border-line">
            {search.data.map((p) => (
              <li key={p.placeId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <MapPin className="size-4 shrink-0 text-dim" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-ink">{p.name || "Unnamed place"}</span>
                  {p.address && <span className="truncate text-[13px] text-dim">{p.address}</span>}
                </div>
                <Button
                  size="sm"
                  variant={status.link?.placeId === p.placeId ? "subtle" : "outline"}
                  disabled={setPlace.isPending}
                  onClick={() => setPlace.mutate({ projectId, placeId: p.placeId })}
                >
                  {status.link?.placeId === p.placeId ? "Current" : "Use this"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function LinkCard({ status, link }: { status: Status; link: NonNullable<Status["link"]> }) {
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [copied, setCopied] = useState(false);
  const [changing, setChanging] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it.");
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Your review link"
          divided
          action={
            fullAccess && (
              <Button size="sm" variant="ghost" onClick={() => setChanging((v) => !v)}>
                {changing ? "Cancel" : "Change business"}
              </Button>
            )
          }
        />
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            <Input
              readOnly
              value={link.url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-[240px] flex-1 font-normal"
              aria-label="Review link"
            />
            <Button
              variant="primary"
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              onClick={() => void copy()}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <ButtonAnchor
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLink className="size-4" />}
            >
              Open
            </ButtonAnchor>
          </div>
          <p className="text-[13px] text-dim">
            Google listing: <span className="text-ink">{link.businessName}</span>
            {link.address ? `, ${link.address}` : ""}
          </p>
          {link.googleUrl && <GoogleLinkRow googleUrl={link.googleUrl} canEdit={fullAccess} />}
          {status.recommended.length > 0 && (
            <p className="text-[13px] text-dim">
              Tip: add your {status.recommended.map((f) => REVIEW_FIELD_LABELS[f].toLowerCase()).join(" and ")} in{" "}
              <Link href={businessInfoHref(projectId)} className="text-coral-text underline-offset-2 hover:underline">
                Business info
              </Link>{" "}
              so customers recognize you.
            </p>
          )}
        </div>
      </Card>
      {changing && <PlaceSearch status={status} onDone={() => setChanging(false)} />}
    </>
  );
}

/** Paste box for the Business Profile review link (Read reviews › Get more reviews › Share). */
function GoogleLinkForm({ initial, onDone }: { initial?: string; onDone?: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const [value, setValue] = useState(initial ?? "");

  const save = useMutation(
    trpc.feedback.setGoogleUrl.mutationOptions({
      onSuccess: () => {
        toast.success("Google review link saved.");
        void queryClient.invalidateQueries({ queryKey: trpc.feedback.status.queryKey({ projectId }) });
        onDone?.();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) save.mutate({ projectId, url: value.trim() });
      }}
    >
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-dim">
        <li>
          Open your{" "}
          <a
            href="https://business.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-text underline-offset-2 hover:underline"
          >
            Google Business Profile
          </a>
          .
        </li>
        <li>Select Read reviews, then Get more reviews.</li>
        <li>Select Share, copy the link and paste it here.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://g.page/r/.../review"
          className="min-w-[240px] flex-1"
          aria-label="Google review link"
        />
        <Button type="submit" variant="dark" disabled={save.isPending || !value.trim()}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        {onDone && initial && (
          <Button variant="ghost" disabled={save.isPending} onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/** Required step after picking the business: nothing is live until the review link is pasted. */
function GoogleLinkRequired({ status, link }: { status: Status; link: NonNullable<Status["link"]> }) {
  const fullAccess = useProject()?.role === "full-access";
  const [changing, setChanging] = useState(false);

  return (
    <>
      <Card>
        <CardHeader
          title="Add your Google review link"
          divided
          action={
            fullAccess && (
              <Button size="sm" variant="ghost" onClick={() => setChanging((v) => !v)}>
                {changing ? "Cancel" : "Change business"}
              </Button>
            )
          }
        />
        <div className="flex flex-col gap-4 p-6">
          <p className="text-sm text-dim">
            Happy customers are sent to this link to post their review on Google. Your review page goes live once
            it's added.
          </p>
          <p className="text-[13px] text-dim">
            Google listing: <span className="text-ink">{link.businessName}</span>
            {link.address ? `, ${link.address}` : ""}
          </p>
          {fullAccess ? (
            <GoogleLinkForm />
          ) : (
            <p className="text-sm text-dim">Ask the site owner to add the Google review link.</p>
          )}
        </div>
      </Card>
      {changing && <PlaceSearch status={status} onDone={() => setChanging(false)} />}
    </>
  );
}

/** Where 5-star customers land, with a way to replace the link. */
function GoogleLinkRow({ googleUrl, canEdit }: { googleUrl: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-inner border border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-ink">Google review link</span>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[13px] text-coral-text underline-offset-2 hover:underline"
        >
          Test it <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
      <span className="truncate text-[13px] text-dim">{googleUrl}</span>
      {canEdit &&
        (editing ? (
          <GoogleLinkForm initial={googleUrl} onDone={() => setEditing(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="self-start text-[13px] text-coral-text underline-offset-2 hover:underline"
          >
            Change link
          </button>
        ))}
    </div>
  );
}

function Stats() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const stats = useQuery(trpc.feedback.stats.queryOptions({ projectId }));
  const s = stats.data;
  const value = (n: number | undefined) => (s && s.total > 0 && n !== undefined ? String(n) : "—");
  return (
    <KpiGrid
      items={[
        { label: "Ratings", value: value(s?.total) },
        {
          label: "Average",
          value: s && s.average != null ? `${s.average.toFixed(1)} / 5` : "—",
        },
        { label: "Sent to Google", value: value(s?.toGoogle) },
        { label: "Private feedback", value: value(s?.private) },
      ]}
    />
  );
}

function FeedbackTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [rating, setRating] = useState<RatingFilter>("all");
  const [cursors, setCursors] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const cursor = cursors.at(-1);

  const list = useQuery({
    ...trpc.feedback.list.queryOptions({ projectId, rating, cursor }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation(
    trpc.feedback.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Feedback deleted.");
        void queryClient.invalidateQueries({ queryKey: trpc.feedback.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const columns: Column<Entry>[] = [
    { key: "rating", header: "Rating", width: "110px", cell: (r) => <Stars rating={r.rating} /> },
    {
      key: "message",
      header: "Feedback",
      width: "minmax(240px, 2.5fr)",
      cell: (r) =>
        r.message ? (
          <p className="whitespace-pre-wrap py-3 text-ink">{r.message}</p>
        ) : r.wentToGoogle ? (
          <Badge tone="success">Went to Google</Badge>
        ) : (
          <span className="text-faint">Rating only</span>
        ),
    },
    {
      key: "from",
      header: "From",
      width: "minmax(140px, 1fr)",
      cell: (r) =>
        r.name || r.contact ? (
          <div className="flex min-w-0 flex-col">
            {r.name && <span className="truncate text-ink">{r.name}</span>}
            {r.contact && <span className="truncate">{r.contact}</span>}
          </div>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: "date",
      header: "Date",
      width: "120px",
      cell: (r) => format(parseISO(r.createdAt), "MMM d, yyyy"),
    },
    ...(fullAccess
      ? [
          {
            key: "actions",
            header: "",
            width: "48px",
            align: "end" as const,
            cell: (r: Entry) => (
              <button
                type="button"
                aria-label="Delete feedback"
                className="rounded-control p-1.5 text-dim hover:bg-subtle hover:text-ink"
                onClick={() => setDeleting(r)}
              >
                <Trash2 className="size-4" />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader
        title="Feedback"
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
              icon={<MessageSquare className="size-5" />}
              title={rating === "all" ? "No ratings yet" : "Nothing with this rating"}
              text="Copy your review link and send it to customers after a job. Their ratings show up here."
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
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this feedback?"
        description="It's removed from your Feedback list and stats. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleting && remove.mutate({ projectId, id: deleting.id })}
      />
    </Card>
  );
}
