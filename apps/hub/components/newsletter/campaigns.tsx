"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Mail, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { cn } from "@workspace/ui/lib/utils";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

import type { NewsletterTab } from "./newsletter-page";
import { Pager } from "./pager";
import { CAMPAIGN_STATUS, useNewsletter } from "./use-newsletter";

type Campaign = RouterOutputs["newsletter"]["campaigns"]["list"]["campaigns"][number];
const FILTERS = ["all", "DRAFT", "SCHEDULED", "SENT"] as const;

export function CampaignsSection({ go }: { go: (tab: NewsletterTab) => void }) {
  const trpc = useTRPC();
  const { projectId, canWrite } = useNewsletter();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const list = useQuery(
    trpc.newsletter.campaigns.list.queryOptions(
      { projectId, page, status: filter === "all" ? undefined : filter },
      { placeholderData: keepPreviousData }
    )
  );

  return (
    <Card className={cn(list.isPlaceholderData && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h2 className="text-base font-semibold">Campaigns</h2>
        <SegmentedTabs
          label="Campaign status"
          value={filter}
          onChange={(id) => {
            setFilter(id as (typeof FILTERS)[number]);
            setPage(1);
          }}
          items={[
            { id: "all", label: "All" },
            { id: "DRAFT", label: "Drafts" },
            { id: "SCHEDULED", label: "Scheduled" },
            { id: "SENT", label: "Sent" },
          ]}
        />
      </div>
      <CampaignTable
        rows={list.data?.campaigns ?? []}
        loading={list.isLoading}
        empty={
          <EmptyState
            icon={<Mail className="size-5" />}
            title="No campaigns yet"
            text="Write your first email, like a seasonal offer or news about your business, and send it to your list."
            action={canWrite ? <NewCampaignDialog size="sm" onNeedDomain={() => go("domain")} /> : undefined}
          />
        }
      />
      <Pager page={page} totalPages={list.data?.totalPage ?? 1} onChange={setPage} />
    </Card>
  );
}

export function CampaignTable({
  rows,
  loading,
  empty,
  compact,
}: {
  rows: Campaign[];
  loading?: boolean;
  empty?: React.ReactNode;
  compact?: boolean;
}) {
  const { base } = useNewsletter();
  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Campaign",
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-ink">{c.name}</span>
          <span className="truncate text-xs text-dim">{c.subject}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      cell: (c) => {
        const s = CAMPAIGN_STATUS[c.status] ?? { label: c.status, tone: "neutral" as const };
        return <Badge tone={s.tone} dot>{s.label}</Badge>;
      },
    },
    ...(compact
      ? []
      : [
          {
            key: "delivered",
            header: "Delivered",
            width: "110px",
            cell: (c: Campaign) => (c.status === "DRAFT" ? "—" : `${c.delivered} / ${c.total}`),
          },
          {
            key: "unsubscribed",
            header: "Unsubscribed",
            width: "120px",
            cell: (c: Campaign) => (c.status === "DRAFT" ? "—" : c.unsubscribed),
          },
        ]),
    {
      key: "when",
      header: "Updated",
      width: compact ? "110px" : "150px",
      align: "end",
      cell: (c) =>
        c.status === "SCHEDULED" && c.scheduledAt
          ? format(new Date(c.scheduledAt), "MMM d, h:mm a")
          : formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true }),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(c) => c.id}
      rowHref={(c) => `${base}/campaigns/${c.id}`}
      minWidth={compact ? 420 : 720}
      empty={
        loading ? (
          <div className="px-6 py-10 text-center text-[13px] text-faint">Loading…</div>
        ) : (
          (empty ?? <div className="px-6 py-10 text-center text-[13px] text-faint">No campaigns yet</div>)
        )
      }
    />
  );
}

/** New campaign: name, subject, sender on the project's verified domain, optional template. */
export function NewCampaignDialog({
  size = "md",
  onNeedDomain,
}: {
  size?: "md" | "sm";
  onNeedDomain: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId, base } = useNewsletter();
  const [open, setOpen] = useState(false);

  const domain = useQuery(trpc.newsletter.domain.get.queryOptions({ projectId }));
  const templates = useQuery({
    ...trpc.newsletter.templates.list.queryOptions({ projectId, page: 1 }),
    enabled: open,
  });
  const verified = domain.data?.status === "SUCCESS";

  const create = useMutation(
    trpc.newsletter.campaigns.create.mutationOptions({
      onSuccess: ({ id }) => {
        queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });
        setOpen(false);
        router.push(`${base}/campaigns/${id}`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="primary" size={size} icon={<Plus className="size-3.5" />}>
            New campaign
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
          <DialogDescription>
            {verified
              ? "Start from a blank email or one of your templates. You'll write it next."
              : "Campaigns are sent from your own domain. Verify it first."}
          </DialogDescription>
        </DialogHeader>
        {!verified ? (
          <DialogFooter>
            <Button
              variant="primary"
              onClick={() => {
                setOpen(false);
                onNeedDomain();
              }}
            >
              {domain.data ? "Verify your domain" : "Add your domain"}
            </Button>
          </DialogFooter>
        ) : (
          <>
            <form
              id="new-campaign"
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const templateId = String(form.get("templateId") ?? "");
                create.mutate({
                  projectId,
                  name: String(form.get("name") ?? ""),
                  subject: String(form.get("subject") ?? ""),
                  fromName: String(form.get("fromName") ?? ""),
                  localPart: String(form.get("localPart") ?? ""),
                  templateId: templateId || undefined,
                });
              }}
            >
              <Field label="Campaign name" hint="Only you see this.">
                <Input name="name" required placeholder="Spring offer" />
              </Field>
              <Field label="Subject line">
                <Input name="subject" required placeholder="20% off this week only" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="From name">
                  <Input name="fromName" placeholder="Your business" />
                </Field>
                <Field label="From address">
                  <div className="flex items-center gap-1.5">
                    <Input name="localPart" required defaultValue="news" className="min-w-0" />
                    <span className="shrink-0 text-[13px] text-dim">@{domain.data?.name}</span>
                  </div>
                </Field>
              </div>
              <Field label="Start from" optional>
                <Select name="templateId" defaultValue="">
                  <option value="">Blank email</option>
                  {templates.data?.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </form>
            <DialogFooter>
              <Button variant="primary" type="submit" form="new-campaign" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create and write"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
