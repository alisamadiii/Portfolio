"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Ban, Plus } from "lucide-react";
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
import { Field, Input, Textarea } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

import { Pager } from "./pager";
import { QueryError } from "./query-error";
import { useNewsletter } from "./use-newsletter";

type Row = RouterOutputs["newsletter"]["suppressions"]["list"]["suppressions"][number];
const REASON: Record<Row["reason"], { label: string; tone: "warning" | "coral" | "neutral" }> = {
  HARD_BOUNCE: { label: "Bounced", tone: "warning" },
  COMPLAINT: { label: "Marked as spam", tone: "coral" },
  MANUAL: { label: "Added by you", tone: "neutral" },
};

/** Addresses that never get email: bounces, spam complaints and manual blocks. */
export function SuppressionsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId, canManage } = useNewsletter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState<"all" | Row["reason"]>("all");

  const list = useQuery(
    trpc.newsletter.suppressions.list.queryOptions(
      {
        projectId,
        page,
        search: search.trim() || undefined,
        reason: reason === "all" ? undefined : reason,
      },
      { placeholderData: keepPreviousData }
    )
  );
  const remove = useMutation(
    trpc.newsletter.suppressions.remove.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: trpc.newsletter.suppressions.pathKey() }),
      onError: (e) => toast.error(e.message),
    })
  );

  const stats = list.data?.stats;
  const columns: Column<Row>[] = [
    { key: "email", header: "Email", cell: (r) => <span className="truncate text-sm text-ink">{r.email}</span> },
    {
      key: "reason",
      header: "Reason",
      width: "150px",
      cell: (r) => <Badge tone={REASON[r.reason].tone}>{REASON[r.reason].label}</Badge>,
    },
    {
      key: "added",
      header: "Since",
      width: "140px",
      cell: (r) => formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            width: "90px",
            align: "end" as const,
            cell: (r: Row) =>
              r.reason === "MANUAL" ? (
                <button
                  type="button"
                  className="text-[13px] font-medium text-coral-text hover:text-coral-deep"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ projectId, email: r.email })}
                >
                  Remove
                </button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <>
      <KpiGrid
        items={[
          { label: "Bounced", value: stats ? String(stats.HARD_BOUNCE) : "—" },
          { label: "Marked as spam", value: stats ? String(stats.COMPLAINT) : "—" },
          { label: "Added by you", value: stats ? String(stats.MANUAL) : "—" },
        ]}
      />
      <Card className={cn(list.isPlaceholderData && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          <div className="mr-auto flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Suppressions</h2>
            <p className="text-[13px] text-dim">
              These addresses never receive your emails. Bounces and spam reports are added for you.
            </p>
          </div>
          <Input
            type="search"
            placeholder="Search email"
            className="h-8 w-[200px]"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <SegmentedTabs
            label="Reason"
            value={reason}
            onChange={(id) => {
              setReason(id as typeof reason);
              setPage(1);
            }}
            items={[
              { id: "all", label: "All" },
              { id: "HARD_BOUNCE", label: "Bounced" },
              { id: "COMPLAINT", label: "Spam" },
              { id: "MANUAL", label: "Manual" },
            ]}
          />
          {canManage && <AddSuppressionDialog />}
        </div>
        {list.error && (
          <div className="px-6 pb-4">
            <QueryError error={list.error} onRetry={() => void list.refetch()} />
          </div>
        )}
        <DataTable
          columns={columns}
          rows={list.data?.suppressions ?? []}
          rowKey={(r) => r.id}
          minWidth={560}
          empty={
            list.isLoading ? (
              <div className="px-6 py-10 text-center text-[13px] text-faint">Loading…</div>
            ) : (
              <EmptyState
                icon={<Ban className="size-5" />}
                title="Nobody is blocked"
                text="When an email bounces or someone marks you as spam, they're added here so you stop emailing them."
              />
            )
          }
        />
        <Pager
          page={page}
          totalPages={Math.max(1, Math.ceil((list.data?.total ?? 0) / 50))}
          onChange={setPage}
        />
      </Card>
    </>
  );
}

function AddSuppressionDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const [open, setOpen] = useState(false);
  const add = useMutation(
    trpc.newsletter.suppressions.add.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.newsletter.suppressions.pathKey() });
        setOpen(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" icon={<Plus className="size-3.5" />}>Block emails</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block email addresses</DialogTitle>
          <DialogDescription>They won&apos;t receive any campaign, even if they&apos;re on your list.</DialogDescription>
        </DialogHeader>
        <form
          id="add-suppression"
          onSubmit={(event) => {
            event.preventDefault();
            const raw = String(new FormData(event.currentTarget).get("emails") ?? "");
            const emails = [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
            if (!emails.length) return;
            add.mutate({ projectId, emails: emails.slice(0, 1000) });
          }}
        >
          <Field label="Emails" hint="One per line or separated by commas, up to 1,000.">
            <Textarea name="emails" rows={5} required />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="primary" type="submit" form="add-suppression" disabled={add.isPending}>
            Block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
