"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { LayoutTemplate, Plus } from "lucide-react";
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

import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";

import { Pager } from "./pager";
import { QueryError } from "./query-error";
import { useNewsletter } from "./use-newsletter";

type Template = RouterOutputs["newsletter"]["templates"]["list"]["templates"][number];

/** Reusable email designs. A campaign can start from any of them. */
export function TemplatesSection() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId, base, canWrite } = useNewsletter();
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Template | null>(null);

  const list = useQuery(
    trpc.newsletter.templates.list.queryOptions({ projectId, page }, { placeholderData: keepPreviousData })
  );
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.newsletter.templates.pathKey() });

  const duplicate = useMutation(
    trpc.newsletter.templates.duplicate.mutationOptions({
      onSuccess: (t) => {
        refresh();
        router.push(`${base}/templates/${t.id}`);
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const remove = useMutation(
    trpc.newsletter.templates.delete.mutationOptions({
      onSuccess: refresh,
      onError: (e) => toast.error(e.message),
    })
  );

  const columns: Column<Template>[] = [
    {
      key: "name",
      header: "Template",
      cell: (t) => (
        <button
          type="button"
          className="flex min-w-0 flex-col text-left"
          onClick={() => router.push(`${base}/templates/${t.id}`)}
        >
          <span className="truncate text-sm font-medium text-ink">{t.name}</span>
          <span className="truncate text-xs text-dim">{t.subject || "No subject"}</span>
        </button>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      width: "150px",
      cell: (t) => formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true }),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            width: "170px",
            align: "end" as const,
            cell: (t: Template) => (
              <div className="flex gap-3 text-[13px] font-medium">
                <button
                  type="button"
                  className="text-coral-text hover:text-coral-deep"
                  disabled={duplicate.isPending}
                  onClick={() => duplicate.mutate({ projectId, templateId: t.id })}
                >
                  Duplicate
                </button>
                <button type="button" className="text-danger" onClick={() => setDeleting(t)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Templates</h2>
            <p className="text-[13px] text-dim">Save a design once, then start any campaign from it.</p>
          </div>
          {canWrite && <NewTemplateDialog />}
        </div>
        {list.error && (
          <div className="px-6 pb-4">
            <QueryError error={list.error} onRetry={() => void list.refetch()} />
          </div>
        )}
        <DataTable
          columns={columns}
          rows={list.data?.templates ?? []}
          rowKey={(t) => t.id}
          minWidth={560}
          empty={
            list.isLoading ? (
              <div className="px-6 py-10 text-center text-[13px] text-faint">Loading…</div>
            ) : (
              <EmptyState
                icon={<LayoutTemplate className="size-5" />}
                title="No templates yet"
                text="Create a branded layout with your logo and footer, and reuse it for every campaign."
              />
            )
          }
        />
        <Pager page={page} totalPages={list.data?.totalPage ?? 1} onChange={setPage} />
      </Card>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        danger
        title={`Delete ${deleting?.name ?? "template"}?`}
        description="Campaigns already made from it keep their content."
        confirmLabel="Delete"
        onConfirm={() => deleting && remove.mutate({ projectId, templateId: deleting.id })}
      />
    </>
  );
}

function NewTemplateDialog() {
  const trpc = useTRPC();
  const router = useRouter();
  const { projectId, base } = useNewsletter();
  const [open, setOpen] = useState(false);
  const create = useMutation(
    trpc.newsletter.templates.create.mutationOptions({
      onSuccess: (t) => router.push(`${base}/templates/${t.id}`),
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="primary" size="sm" icon={<Plus className="size-3.5" />}>
            New template
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>You&apos;ll design it next.</DialogDescription>
        </DialogHeader>
        <form
          id="new-template"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            create.mutate({
              projectId,
              name: String(form.get("name") ?? ""),
              subject: String(form.get("subject") ?? ""),
            });
          }}
        >
          <Field label="Name">
            <Input name="name" required placeholder="Monthly update" />
          </Field>
          <Field label="Default subject" optional>
            <Input name="subject" />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="primary" type="submit" form="new-template" disabled={create.isPending}>
            Create and design
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
