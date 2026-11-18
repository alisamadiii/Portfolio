"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Building2, Check, Copy, ExternalLink, MapPin, MessageSquare, Star, Trash2 } from "lucide-react";
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
import { GoogleLinkForm, GoogleLinkRow } from "@/components/settings/google-business-card";
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

  // Always refetch: the user may have just changed Settings.
  const status = useQuery({
    ...trpc.feedback.status.queryOptions({ projectId }),
    refetchOnMount: "always",
  });

  const header = (
    <PageHeader
      title="Feedback"
      description="Share one link with your customers. Happy customers are asked to review you on Google, everyone else can tell you privately."
      docs="client-hub/feedback"
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
      {!data.placeId ? (
        <ListingRequired projectId={projectId} />
      ) : !data.link ? (
        <CreateLinkCard status={data} />
      ) : !data.ready ? (
        <SettingsRequired projectId={projectId} missing={data.missing} />
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

/** The review page shows the business name and address: both come from Settings. */
function SettingsRequired({ projectId, missing }: { projectId: string; missing: Status["missing"] }) {
  return (
    <Card>
      <EmptyState
        icon={<Building2 className="size-5" />}
        title="Finish your business details first"
        text={`Your review page shows your business details. Add your ${missing
          .map((f) => REVIEW_FIELD_LABELS[f].toLowerCase())
          .join(" and ")} in Settings, then come back here.`}
        action={
          <ButtonLink variant="primary" href={repoPath(projectId, "settings")}>
            Open Settings
          </ButtonLink>
        }
      />
    </Card>
  );
}

/** Where the Google listing lives: Settings. */
const settingsHref = (projectId: string) => `${repoPath(projectId, "settings")}#google-listing`;

/** No Google listing in Settings yet: nothing to link to. */
function ListingRequired({ projectId }: { projectId: string }) {
  return (
    <Card>
      <EmptyState
        icon={<MapPin className="size-5" />}
        title="Add your Google listing first"
        text="Happy customers are sent to your Google review page, so we need your business on Google Maps. Find it under Google listing in Settings, then come back here."
        action={
          <ButtonLink variant="primary" href={settingsHref(projectId)}>
            Open Settings
          </ButtonLink>
        }
      />
    </Card>
  );
}

/** Listing set, link not created yet. */
function CreateLinkCard({ status }: { status: Status }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";

  const createLink = useMutation(
    trpc.feedback.createLink.mutationOptions({
      onSuccess: () => {
        toast.success("Review link created.");
        void queryClient.invalidateQueries({ queryKey: trpc.feedback.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Card>
      <CardHeader title="Create your review link" divided />
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-dim">
          One link to share with customers: 5 stars go to your Google review page, everyone else tells you
          privately.
        </p>
        <Listing status={status} />
        {fullAccess ? (
          <div>
            <Button variant="primary" disabled={createLink.isPending} onClick={() => createLink.mutate({ projectId })}>
              {createLink.isPending ? "Creating…" : "Create review link"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-dim">Ask the site owner to create the review link.</p>
        )}
      </div>
    </Card>
  );
}

/** The listing from Settings, with a way to change it there. */
function Listing({ status }: { status: Status }) {
  const projectId = useRouteProjectId();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-inner border border-line px-4 py-3">
      <MapPin className="size-4 shrink-0 text-dim" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">{status.businessName || "Your listing"}</span>
        {status.address && <span className="truncate text-[13px] text-dim">{status.address}</span>}
      </div>
      <ButtonLink size="sm" variant="outline" href={settingsHref(projectId)}>
        Change in Settings
      </ButtonLink>
    </div>
  );
}

function LinkCard({ status, link }: { status: Status; link: NonNullable<Status["link"]> }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [copied, setCopied] = useState(false);

  const setGoogleUrl = useMutation(
    trpc.feedback.setGoogleUrl.mutationOptions({
      onSuccess: () => {
        toast.success("Google review link saved.");
        void queryClient.invalidateQueries({ queryKey: trpc.feedback.pathKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.project.business.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

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
        <CardHeader title="Your review link" divided />
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
          <Listing status={status} />
          <GoogleLinkRow
            googleUrl={link.googleUrl}
            canEdit={fullAccess}
            saving={setGoogleUrl.isPending}
            onSave={(url) => setGoogleUrl.mutate({ projectId, url })}
          />
          {status.recommended.length > 0 && (
            <p className="text-[13px] text-dim">
              Tip: add your {status.recommended.map((f) => REVIEW_FIELD_LABELS[f].toLowerCase()).join(" and ")} in{" "}
              <Link href={repoPath(projectId, "settings")} className="text-coral-text underline-offset-2 hover:underline">
                Settings
              </Link>{" "}
              so customers recognize you.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}

/** Required step after picking the business: nothing is live until the review link is pasted. */
function GoogleLinkRequired({ status, link }: { status: Status; link: NonNullable<Status["link"]> }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";

  const setGoogleUrl = useMutation(
    trpc.feedback.setGoogleUrl.mutationOptions({
      onSuccess: () => {
        toast.success("Google review link saved.");
        void queryClient.invalidateQueries({ queryKey: trpc.feedback.pathKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.project.business.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <>
      <Card>
        <CardHeader title="Add your Google review link" divided />
        <div className="flex flex-col gap-4 p-6">
          <p className="text-sm text-dim">
            Happy customers are sent to this link to post their review on Google. Your review page goes live once
            it&apos;s added.
          </p>
          <Listing status={status} />
          {fullAccess ? (
            <GoogleLinkForm
              saving={setGoogleUrl.isPending}
              onSave={(url) => setGoogleUrl.mutate({ projectId, url })}
            />
          ) : (
            <p className="text-sm text-dim">Ask the site owner to add the Google review link.</p>
          )}
        </div>
      </Card>
    </>
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
