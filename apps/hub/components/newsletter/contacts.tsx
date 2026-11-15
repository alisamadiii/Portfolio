"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Plus, Trash2, Upload, Users } from "lucide-react";
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

import { Padded } from "@/components/ds/layout/padded";
import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

import { ListMenu, NewListDialog } from "./list-actions";
import { guessColumns, parseCsv, toImportRows, type ColumnMap } from "./csv";
import { Pager } from "./pager";
import { QueryError } from "./query-error";
import { useNewsletter } from "./use-newsletter";

type List = RouterOutputs["newsletter"]["contacts"]["lists"][number];
type Contact = RouterOutputs["newsletter"]["contacts"]["list"]["contacts"][number];
const PAGE_SIZE = 50;

const listName = (l: { name: string; emoji: string | null }) =>
  l.emoji ? `${l.emoji} ${l.name}` : l.name;

/** Contacts tab: every list in the workspace. Opening one shows its contacts. */
export function ContactsSection() {
  const trpc = useTRPC();
  const router = useRouter();
  const { projectId, base, canWrite, canManage } = useNewsletter();
  const lists = useQuery(trpc.newsletter.contacts.lists.queryOptions({ projectId }));
  const open = (listId: string) => router.push(`${base}/contacts/${listId}`);
  const rows = lists.data ?? [];

  const columns: Column<List>[] = [
    {
      key: "name",
      header: "List",
      cell: (l) => <span className="truncate text-sm font-medium text-ink">{listName(l)}</span>,
    },
    {
      key: "total",
      header: "Contacts",
      width: "120px",
      cell: (l) => l.total.toLocaleString(),
    },
    {
      key: "subscribed",
      header: "Subscribed",
      width: "120px",
      cell: (l) => l.subscribed.toLocaleString(),
    },
    {
      key: "unsubscribed",
      header: "Unsubscribed",
      width: "120px",
      cell: (l) => (l.total - l.subscribed).toLocaleString(),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            width: "56px",
            align: "end" as const,
            // The menu and its dialogs live inside the row: keep their clicks from opening it.
            cell: (l: List) => (
              <div onClick={(e) => e.stopPropagation()}>
                <ListMenu list={l} canDelete={canManage} onDeleted={() => {}} />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">Lists</h2>
          <p className="text-[13px] text-dim">Group your contacts, then send a campaign to one list.</p>
        </div>
        {canWrite && <NewListDialog onCreated={open} />}
      </div>
      {lists.error && (
        <div className="px-6 pb-4">
          <QueryError error={lists.error} onRetry={() => void lists.refetch()} />
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        minWidth={600}
        onRowClick={(l) => open(l.id)}
        empty={
          lists.isLoading ? (
            <div className="px-6 py-10 text-center text-[13px] text-faint">Loading…</div>
          ) : (
            <EmptyState
              icon={<Users className="size-5" />}
              title="No lists yet"
              text="Create a list, then import your customers or add them one by one."
            />
          )
        }
      />
    </Card>
  );
}

/** /newsletter/contacts/[listId]: the contacts in one list. */
export function ContactListPage({ listId }: { listId: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId, base, canWrite, canManage } = useNewsletter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "true" | "false">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lists = useQuery(trpc.newsletter.contacts.lists.queryOptions({ projectId }));
  const current = lists.data?.find((l) => l.id === listId);
  const back = `${base}?tab=contacts`;

  const list = useQuery(
    trpc.newsletter.contacts.list.queryOptions(
      {
        projectId,
        listId,
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
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">{c.email}</span>
          {(c.firstName || c.lastName) && (
            <span className="truncate text-xs text-dim">
              {[c.firstName, c.lastName].filter(Boolean).join(" ")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
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
      width: "140px",
      cell: (c) => formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            width: "110px",
            align: "end" as const,
            cell: (c: Contact) => (
              <button
                type="button"
                className="text-[13px] text-dim hover:text-ink disabled:opacity-50"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({ projectId, listId, contactId: c.id, subscribed: !c.subscribed })
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
  const n = (v: number | undefined) => (v == null ? "—" : v.toLocaleString());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Link href={back} className="inline-flex items-center gap-1.5 text-[13px] text-dim hover:text-ink">
          <ArrowLeft className="size-3.5" />
          Contacts
        </Link>
        <span className="text-faint">/</span>
        <h1 className="min-w-0 truncate text-base font-semibold">
          {current ? listName(current) : lists.isLoading ? "…" : "List"}
        </h1>
        {canWrite && current && (
          <ListMenu list={current} canDelete={canManage} onDeleted={() => router.push(back)} />
        )}
        {canWrite && (
          <div className="ml-auto flex gap-2">
            <ImportDialog listId={listId} />
            <AddContactDialog listId={listId} />
          </div>
        )}
      </div>
      <Padded>
        <QueryError
          error={lists.error ?? list.error}
          onRetry={() => {
            void lists.refetch();
            void list.refetch();
          }}
        />
        <KpiGrid
          items={[
            { label: "Contacts", value: n(current?.total) },
            { label: "Subscribed", value: n(list.data?.subscribed) },
            { label: "Unsubscribed", value: n(list.data?.unsubscribed) },
          ]}
        />
        <Card className={cn(list.isPlaceholderData && "opacity-60")}>
          <div className="flex flex-wrap items-center gap-3 px-6 py-4">
            <Input
              type="search"
              placeholder="Search email or name"
              className="h-8 w-full sm:w-[260px]"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <div className="sm:ml-auto">
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
            </div>
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
            minWidth={640}
            empty={
              list.isLoading ? (
                <div className="px-6 py-10 text-center text-[13px] text-faint">Loading…</div>
              ) : (
                <EmptyState
                  icon={<Users className="size-5" />}
                  title={search || filter !== "all" ? "No matching contacts" : "No contacts yet"}
                  text="Import your customer list or add contacts one by one."
                />
              )
            }
          />
          <Pager page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} onChange={setPage} />
        </Card>
      </Padded>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        danger
        title={`Delete ${selected.size} contact${selected.size === 1 ? "" : "s"}?`}
        description="They're removed from this list. To stop emailing someone but keep their record, unsubscribe them instead."
        confirmLabel="Delete"
        onConfirm={() => remove.mutate({ projectId, listId, contactIds: [...selected] })}
      />
    </div>
  );
}

function AddContactDialog({ listId }: { listId?: string }) {
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
              listId,
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
export function ImportDialog({ listId }: { listId?: string }) {
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
        await importChunk.mutateAsync({ projectId, listId, rows });
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
