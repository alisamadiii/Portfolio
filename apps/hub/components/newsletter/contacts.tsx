"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2, Upload, Users } from "lucide-react";
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
import { CONTACT_IMPORT_CHUNK, chunk } from "@workspace/trpc/lib/newsletter-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { cn } from "@workspace/ui/lib/utils";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

import { guessColumns, parseCsv, toImportRows, type ColumnMap } from "./csv";
import { Pager } from "./pager";
import { useNewsletter } from "./use-newsletter";

type Contact = RouterOutputs["newsletter"]["contacts"]["list"]["contacts"][number];
const PAGE_SIZE = 50;

export function ContactsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId, canWrite } = useNewsletter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "true" | "false">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const list = useQuery(
    trpc.newsletter.contacts.list.queryOptions(
      {
        projectId,
        page,
        search: search.trim() || undefined,
        subscribed: filter === "all" ? undefined : filter,
      },
      { placeholderData: keepPreviousData }
    )
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });

  const update = useMutation(
    trpc.newsletter.contacts.update.mutationOptions({
      onSuccess: refresh,
      onError: (e) => toast.error(e.message),
    })
  );
  const remove = useMutation(
    trpc.newsletter.contacts.delete.mutationOptions({
      onSuccess: () => {
        setSelected(new Set());
        refresh();
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const rows = list.data?.contacts ?? [];
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const columns: Column<Contact>[] = [
    ...(canWrite
      ? [
          {
            key: "pick",
            header: (
              <input
                type="checkbox"
                aria-label="Select all"
                className="accent-coral"
                checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                onChange={(e) =>
                  setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                }
              />
            ),
            width: "36px",
            cell: (c: Contact) => (
              <input
                type="checkbox"
                aria-label={`Select ${c.email}`}
                className="accent-coral"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
              />
            ),
          },
        ]
      : []),
    {
      key: "email",
      header: "Email",
      cell: (c) => <span className="truncate text-sm text-ink">{c.email}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (c) => [c.firstName, c.lastName].filter(Boolean).join(" ") || "—",
    },
    {
      key: "status",
      header: "Status",
      width: "130px",
      cell: (c) =>
        c.subscribed ? (
          <Badge tone="success" dot>Subscribed</Badge>
        ) : (
          <Badge tone="neutral" dot>Unsubscribed</Badge>
        ),
    },
    {
      key: "added",
      header: "Added",
      width: "130px",
      cell: (c) => formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            width: "120px",
            align: "end" as const,
            cell: (c: Contact) => (
              <button
                type="button"
                className="text-[13px] font-medium text-coral-text hover:text-coral-deep disabled:opacity-50"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({ projectId, contactId: c.id, subscribed: !c.subscribed })
                }
              >
                {c.subscribed ? "Unsubscribe" : "Resubscribe"}
              </button>
            ),
          },
        ]
      : []),
  ];

  const total = list.data?.total ?? 0;

  return (
    <>
      <KpiGrid
        items={[
          { label: "Subscribed", value: list.data ? list.data.subscribed.toLocaleString() : "—" },
          { label: "Unsubscribed", value: list.data ? list.data.unsubscribed.toLocaleString() : "—" },
        ]}
      />
      <Card className={cn(list.isPlaceholderData && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          <h2 className="mr-auto text-base font-semibold">Contacts</h2>
          <Input
            type="search"
            placeholder="Search email or name"
            className="h-8 w-[220px]"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <SegmentedTabs
            label="Subscription"
            value={filter}
            onChange={(id) => {
              setFilter(id as typeof filter);
              setPage(1);
            }}
            items={[
              { id: "all", label: "All" },
              { id: "true", label: "Subscribed" },
              { id: "false", label: "Unsubscribed" },
            ]}
          />
          {canWrite && (
            <>
              <ImportDialog />
              <AddContactDialog />
            </>
          )}
        </div>
        {canWrite && selected.size > 0 && (
          <div className="flex items-center gap-3 border-t border-divider bg-sidebar px-6 py-2.5 text-[13px]">
            <span>{selected.size} selected</span>
            <Button
              size="sm"
              icon={<Trash2 className="size-3.5" />}
              disabled={remove.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </div>
        )}
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          minWidth={720}
          empty={
            list.isLoading ? (
              <div className="px-6 py-10 text-center text-[13px] text-faint">Loading…</div>
            ) : (
              <EmptyState
                icon={<Users className="size-5" />}
                title={search || filter !== "all" ? "No matching contacts" : "No subscribers yet"}
                text="Import your customer list or add a signup form to your website."
              />
            )
          }
        />
        <Pager page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onChange={setPage} />
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        danger
        title={`Delete ${selected.size} contact${selected.size === 1 ? "" : "s"}?`}
        description="They're removed from your list. To stop emailing someone but keep their record, unsubscribe them instead."
        confirmLabel="Delete"
        onConfirm={() => remove.mutate({ projectId, contactIds: [...selected] })}
      />
    </>
  );
}

function AddContactDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const [open, setOpen] = useState(false);
  const add = useMutation(
    trpc.newsletter.contacts.add.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });
        setOpen(false);
        toast.success("Contact added");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="primary" size="sm" icon={<Plus className="size-3.5" />}>
            Add contact
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a contact</DialogTitle>
          <DialogDescription>Only add people who agreed to hear from you.</DialogDescription>
        </DialogHeader>
        <form
          id="add-contact"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            add.mutate({
              projectId,
              email: String(form.get("email") ?? ""),
              firstName: String(form.get("firstName") ?? "") || undefined,
              lastName: String(form.get("lastName") ?? "") || undefined,
            });
          }}
        >
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" optional>
              <Input name="firstName" />
            </Field>
            <Field label="Last name" optional>
              <Input name="lastName" />
            </Field>
          </div>
        </form>
        <DialogFooter>
          <Button variant="primary" type="submit" form="add-contact" disabled={add.isPending}>
            Add contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** CSV import: pick a file, confirm the columns, upload in chunks of 1000. */
export function ImportDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState<string[][] | null>(null);
  const [map, setMap] = useState<ColumnMap>({ email: -1, firstName: -1, lastName: -1 });
  const [hasHeader, setHasHeader] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const importChunk = useMutation(trpc.newsletter.contacts.import.mutationOptions());

  const header = table?.[0] ?? [];
  const prepared = useMemo(() => {
    const body = table ? (hasHeader ? table.slice(1) : table) : [];
    return map.email >= 0 ? toImportRows(body, map) : { rows: [], skipped: body.length };
  }, [table, hasHeader, map]);

  const reset = () => {
    setTable(null);
    setProgress(null);
  };

  const onFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files up to 10 MB.");
      return;
    }
    const rows = parseCsv(await file.text());
    if (!rows.length) {
      toast.error("That file is empty.");
      return;
    }
    const guessed = guessColumns(rows[0]!);
    const headerLooksLikeData = rows[0]!.some((c) => c.includes("@"));
    setHasHeader(!headerLooksLikeData);
    setMap(
      headerLooksLikeData
        ? { email: rows[0]!.findIndex((c) => c.includes("@")), firstName: -1, lastName: -1 }
        : guessed
    );
    setTable(rows);
  };

  const run = async () => {
    const batches = chunk(prepared.rows, CONTACT_IMPORT_CHUNK);
    setProgress({ done: 0, total: prepared.rows.length });
    let done = 0;
    try {
      for (const rows of batches) {
        await importChunk.mutateAsync({ projectId, rows });
        done += rows.length;
        setProgress({ done, total: prepared.rows.length });
      }
      toast.success(`${done.toLocaleString()} contacts imported`);
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(
        `${(error as Error).message} (${done.toLocaleString()} of ${prepared.rows.length.toLocaleString()} imported)`
      );
      setProgress(null);
    } finally {
      queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });
    }
  };

  const columnSelect = (key: keyof ColumnMap, label: string, required?: boolean) => (
    <Field label={label} optional={!required}>
      <Select
        value={String(map[key])}
        onChange={(e) => setMap({ ...map, [key]: Number(e.target.value) })}
      >
        <option value="-1">{required ? "Choose a column" : "None"}</option>
        {(table?.[0] ?? []).map((h, i) => (
          <option key={i} value={i}>
            {hasHeader ? h || `Column ${i + 1}` : `Column ${i + 1} (${h})`}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (progress) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" icon={<Upload className="size-3.5" />}>Import</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import subscribers</DialogTitle>
          <DialogDescription>
            Upload a CSV with an email column. Only import people who agreed to hear from you.
          </DialogDescription>
        </DialogHeader>
        {!table ? (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-line-strong px-6 py-10 text-center hover:bg-canvas">
            <Upload className="size-5 text-dim" />
            <span className="text-sm font-medium">Choose a CSV file</span>
            <span className="text-[13px] text-dim">Exports from Mailchimp, Shopify, Excel or Google Sheets work.</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                className="accent-coral"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
              />
              First row is a header
            </label>
            {columnSelect("email", "Email column", true)}
            <div className="grid grid-cols-2 gap-3">
              {columnSelect("firstName", "First name")}
              {columnSelect("lastName", "Last name")}
            </div>
            <p className="text-[13px] text-dim">
              {prepared.rows.length.toLocaleString()} contacts ready
              {prepared.skipped > 0 && ` · ${prepared.skipped.toLocaleString()} skipped (no valid email or duplicate)`}
            </p>
            {progress && (
              <p className="text-[13px] font-medium">
                Importing {progress.done.toLocaleString()} of {progress.total.toLocaleString()}…
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          {table && !progress && (
            <Button variant="outline" onClick={reset}>
              Choose another file
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!table || prepared.rows.length === 0 || !!progress || header.length === 0}
            onClick={() => void run()}
          >
            Import {prepared.rows.length ? prepared.rows.length.toLocaleString() : ""} contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
