"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useAgency } from "@/components/agency/use-agency";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { handleCmsError } from "@/lib/trpc-errors";

import { TemplateTextarea } from "./template-textarea";

type Template = RouterOutputs["agency"]["templates"]["list"][number];
type Kind = Template["kind"];

const DURATIONS = [15, 30, 45, 60, 90, 120];

const KIND_LABEL: Record<Kind, string> = { appointment: "Appointment", text: "Text snippet" };

/** One-click starters shown while a kind is empty. */
const STARTERS: Record<Kind, { name: string; title?: string; durationMinutes?: number; body: string }> = {
  appointment: {
    name: "Consultation",
    title: "Consultation with [[lead name]]",
    durationMinutes: 30,
    body: "Hi [[lead first name]], looking forward to our call on [[meeting date]] at [[meeting time]].\n\n[[business name]]\n[[business phone]]",
  },
  text: {
    name: "Thanks for reaching out",
    body: "Hi [[lead first name]], thanks for reaching out to [[business name]]! We'll get back to you shortly.",
  },
};

type Draft = {
  id?: number;
  kind: Kind;
  name: string;
  title: string;
  durationMinutes: number;
  body: string;
};

const toDraft = (t: Template): Draft => ({
  id: t.id,
  kind: t.kind,
  name: t.name,
  title: t.title ?? "",
  durationMinutes: t.durationMinutes ?? 30,
  body: t.body,
});

const blank = (kind: Kind): Draft => ({ kind, name: "", title: "", durationMinutes: 30, body: "" });

/** Project templates: appointment templates + "/" text snippets, with [[placeholders]]. */
export function TemplatesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId, role } = useAgency();
  const canEdit = role !== "view-only";
  const listKey = trpc.agency.templates.list.queryKey({ projectId });
  const templates = useQuery(trpc.agency.templates.list.queryOptions({ projectId }));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: listKey });
  const create = useMutation(
    trpc.agency.templates.create.mutationOptions({
      onSuccess: () => {
        toast.success("Template added.");
        setDraft(null);
        refresh();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't save the template.")),
    })
  );
  const update = useMutation(
    trpc.agency.templates.update.mutationOptions({
      onSuccess: () => {
        toast.success("Template saved.");
        setDraft(null);
        refresh();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't save the template.")),
    })
  );
  const remove = useMutation(
    trpc.agency.templates.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Template deleted.");
        refresh();
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't delete the template.")),
    })
  );

  const save = (d: Draft) => {
    const payload = {
      projectId,
      kind: d.kind,
      name: d.name.trim(),
      body: d.body,
      ...(d.kind === "appointment" && { title: d.title.trim(), durationMinutes: d.durationMinutes }),
    };
    if (d.id) update.mutate({ ...payload, templateId: d.id });
    else create.mutate(payload);
  };

  const list = templates.data ?? [];
  const snippets = list.filter((t) => t.kind === "text");

  const columns = (kind: Kind): Column<Template>[] => [
    {
      key: "name",
      header: "Name",
      width: "minmax(180px, 1.2fr)",
      cell: (t) => <span className="truncate font-medium text-ink">{t.name}</span>,
    },
    ...(kind === "appointment"
      ? [
          {
            key: "length",
            header: "Length",
            width: "100px",
            cell: (t: Template) => `${t.durationMinutes ?? 30} min`,
          },
        ]
      : []),
    {
      key: "preview",
      header: kind === "appointment" ? "Title" : "Text",
      width: "minmax(220px, 3fr)",
      cell: (t) => (
        <span className="truncate text-dim">
          {(kind === "appointment" ? t.title || t.body : t.body).replace(/\s+/g, " ") || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "100px",
      align: "end",
      cell: (t) =>
        canEdit ? (
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 className="size-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(t);
            }}
          >
            Delete
          </Button>
        ) : null,
    },
  ];

  const section = (kind: Kind, title: string, hint: string) => {
    const rows = list.filter((t) => t.kind === kind);
    const starter = STARTERS[kind];
    return (
      <Card>
        <CardHeader title={title} divided />
        {templates.isPending ? (
          <Skeleton className="m-6 h-[100px]" />
        ) : (
          <DataTable
            columns={columns(kind)}
            rows={rows}
            rowKey={(t) => String(t.id)}
            minWidth={560}
            onRowClick={canEdit ? (t) => setDraft(toDraft(t)) : undefined}
            empty={
              <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                <p className="text-[13px] text-dim">{hint}</p>
                {canEdit && (
                  <Button
                    size="sm"
                    icon={<Plus className="size-3.5" />}
                    onClick={() =>
                      setDraft({ ...blank(kind), ...starter, title: starter.title ?? "", durationMinutes: starter.durationMinutes ?? 30 })
                    }
                  >
                    Start from &ldquo;{starter.name}&rdquo;
                  </Button>
                )}
              </div>
            }
          />
        )}
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Templates"
        description="Reusable text for appointments and messages. Type [[ to add placeholders like the lead's name, and / to drop in a snippet."
        actions={
          canEdit && (
            <>
              <Button icon={<FileText className="size-4" />} onClick={() => setDraft(blank("text"))}>
                New snippet
              </Button>
              <Button
                variant="primary"
                icon={<CalendarClock className="size-4" />}
                onClick={() => setDraft(blank("appointment"))}
              >
                New appointment
              </Button>
            </>
          )
        }
      />
      {section("appointment", "Appointments", "Appointment templates pre-fill the title, notes and length when you schedule a lead.")}
      {section("text", "Text snippets", "Snippets drop into any notes or description when you type /.")}

      {draft && (
        <TemplateEditor
          key={draft.id ?? `new-${draft.kind}`}
          draft={draft}
          snippets={snippets.filter((s) => s.id !== draft.id)}
          saving={create.isPending || update.isPending}
          onSave={save}
          onClose={() => setDraft(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={<>Delete &ldquo;{deleting?.name}&rdquo;?</>}
        description="It's removed for everyone on this project. Text already used in meetings or notes stays as it is."
        confirmLabel="Delete template"
        danger
        onConfirm={() => deleting && remove.mutate({ projectId, templateId: deleting.id })}
      />
    </div>
  );
}

function TemplateEditor({
  draft,
  snippets,
  saving,
  onSave,
  onClose,
}: {
  draft: Draft;
  snippets: Template[];
  saving: boolean;
  onSave: (d: Draft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(draft);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const valid = d.name.trim() && (d.kind === "text" ? d.body.trim() : d.title.trim());

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {d.id ? "Edit" : "New"} {KIND_LABEL[d.kind].toLowerCase()}
          </DialogTitle>
          <DialogDescription>Type [[ for placeholders, / for snippets.</DialogDescription>
        </DialogHeader>
        <form
          id="template-editor"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSave(d);
          }}
        >
          <Field label="Name">
            <Input
              autoFocus
              value={d.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={80}
              placeholder={d.kind === "appointment" ? "Consultation" : "Thanks for reaching out"}
            />
          </Field>
          {d.kind === "appointment" && (
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <Field label="Event title">
                <Input
                  value={d.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={200}
                  placeholder="Consultation with [[lead name]]"
                />
              </Field>
              <Field label="Length">
                <Select value={d.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))}>
                  {DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <Field label={d.kind === "appointment" ? "Event description" : "Text"} optional={d.kind === "appointment"}>
            <TemplateTextarea
              value={d.body}
              onValueChange={(v) => set("body", v)}
              snippets={snippets}
              rows={6}
              maxLength={5000}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="template-editor" variant="primary" disabled={!valid || saving}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
