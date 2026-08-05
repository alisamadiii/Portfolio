"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Plus,
  Settings2,
  Users,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { DataTable } from "@workspace/ui/custom/data-table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";
import { MarketingSettingsDialog } from "@/components/marketing/settings-dialog";
import { STATUS_PILL } from "@/components/marketing/status";

const PAGE_SIZE = 10;

const PageHeading = () => (
  <>
    <DocumentTitle title="Marketing" />
    <div>
      <h2 className="text-[27px] font-extrabold tracking-tight">
        Marketing Emails
      </h2>
      <p className="text-muted-foreground mt-1 text-[14.5px]">
        Newsletters and announcements sent to your own contact list.
      </p>
    </div>
  </>
);

export default function MarketingPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery(
    trpc.marketing.campaigns.list.queryOptions(
      { page, limit: PAGE_SIZE },
      { enabled: !!currentUser, placeholderData: keepPreviousData }
    )
  );

  const campaigns = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isEmpty = !isLoading && total === 0;

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <div className="mx-auto max-w-sm space-y-2.5">
            <h3 className="text-[22px] font-extrabold tracking-tight">
              Something went wrong
            </h3>
            <p className="text-muted-foreground text-[14.5px]">
              {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading />

      <div className="flex flex-wrap items-center gap-2">
        <Button className="rounded-full" render={<Link href="/marketing/new" />}>
          <Plus className="size-4" />
          New campaign
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          render={<Link href="/marketing/contacts" />}
        >
          <Users className="size-4" />
          Contacts
        </Button>
        <MarketingSettingsDialog>
          <Button variant="outline" className="rounded-full">
            <Settings2 className="size-4" />
            Sender settings
          </Button>
        </MarketingSettingsDialog>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <h3 className="text-[22px] font-extrabold tracking-tight">
            No campaigns yet
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[380px] text-[14.5px]">
            Import your contacts, then create your first campaign — a
            newsletter, a product update, an announcement.
          </p>
          <Button
            className="mt-5 rounded-full px-5"
            render={<Link href="/marketing/new" />}
          >
            Create a campaign
          </Button>
        </div>
      ) : (
        <>
          <DataTable
            className="table-card"
            isLoading={isLoading && PAGE_SIZE}
            columns={[
              {
                id: "name",
                header: "Campaign",
                cell: ({ row }) => (
                  <div className="flex items-center gap-3">
                    <div className="bg-status-review-bg text-status-review grid size-9 shrink-0 place-items-center rounded-[10px] border">
                      <Megaphone className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block max-w-[240px] truncate text-sm font-medium">
                        {row.original.name}
                      </span>
                      <span className="text-muted-foreground block max-w-[240px] truncate text-xs">
                        {row.original.subject}
                      </span>
                    </div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "Status",
                cell: ({ row }) => {
                  const pill =
                    STATUS_PILL[row.original.status] ?? STATUS_PILL.draft!;
                  return (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                        pill.className
                      )}
                    >
                      {pill.label}
                    </span>
                  );
                },
              },
              {
                id: "recipients",
                header: "Recipients",
                cell: ({ row }) => (
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {row.original.status === "draft"
                      ? "—"
                      : row.original.recipientCount}
                  </span>
                ),
              },
              {
                id: "created",
                header: () => <div className="text-right">Created</div>,
                cell: ({ row }) => (
                  <div
                    className="text-muted-foreground text-right text-sm whitespace-nowrap"
                    title={format(
                      new Date(row.original.createdAt),
                      "MMM d, yyyy h:mm a"
                    )}
                  >
                    {formatDistanceToNowStrict(
                      new Date(row.original.createdAt),
                      { addSuffix: true }
                    )}
                  </div>
                ),
              },
            ]}
            data={campaigns}
            onRowClick={(row) =>
              router.push(
                row.original.status === "draft"
                  ? `/marketing/${row.original.id}/edit`
                  : `/marketing/${row.original.id}`
              )
            }
          />

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {total > 0
                ? `Showing ${page * PAGE_SIZE + 1}–${Math.min(
                    (page + 1) * PAGE_SIZE,
                    total
                  )} of ${total}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page === 0}
                onClick={() => setPage((prev) => prev - 1)}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-muted-foreground text-sm tabular-nums">
                {page + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
