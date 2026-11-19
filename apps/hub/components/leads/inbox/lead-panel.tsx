"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { formatPhone, toE164 } from "@workspace/trpc/lib/inbox-shared";
import { placeholderValues, resolveTemplate } from "@workspace/trpc/lib/templates-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import type { AgencyLeadStatus } from "@workspace/drizzle/schema";
import { cn } from "@workspace/ui/lib/utils";

import { ChannelBadge } from "@/components/agency/lead-channel";
import { MeetingCard, ScheduleButton } from "@/components/agency/lead-meeting";
import { formatMoney, LEAD_STATUSES } from "@/components/agency/lead-status";
import { MarkLostDialog, MarkWonDialog } from "@/components/agency/lead-status-dialogs";
import { useAgency } from "@/components/agency/use-agency";
import { Button, IconButton } from "@/components/ds/ui/button";
import { Field, Input } from "@/components/ds/ui/field";
import { TemplateTextarea } from "@/components/templates/template-textarea";
import { appPath } from "@/lib/paths";

type Lead = RouterOutputs["agency"]["leads"]["get"];

const copy = (value: string, label: string) =>
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied.`))
    .catch(() => toast.error("Couldn't copy."));

const entered = (source: string) =>
  source === "manual"
    ? "Added by hand"
    : source === "booking"
      ? "Booked an appointment"
      : source === "sms"
        ? "Texted in"
        : source === "wix"
          ? "Wix form"
          : "Website form";

/** The open lead's details beside the thread: contact, status, meeting, notes. */
export function LeadPanel({ leadId, onClose }: { leadId: number; onClose: () => void }) {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const lead = useQuery(trpc.agency.leads.get.queryOptions({ projectId, id: leadId }));

  return (
    <aside className="flex min-h-0 w-full flex-col" aria-label="Lead details">
      <header className="flex items-center justify-between border-b border-line py-2.5 pr-2 pl-4">
        <span className="text-[15px] font-semibold text-ink">Lead details</span>
        <IconButton aria-label="Close lead details" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {lead.error ? (
          <p className="p-4 text-[13px] text-dim">{lead.error.message}</p>
        ) : !lead.data ? (
          <p className="p-4 text-[13px] text-dim">Loading…</p>
        ) : (
          <PanelBody key={lead.data.id} lead={lead.data} />
        )}
      </div>
    </aside>
  );
}

function PanelBody({ lead }: { lead: Lead }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId, role } = useAgency();
  const canEdit = role !== "view-only";
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [statusDialog, setStatusDialog] = useState<"won" | "lost" | null>(null);
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState({
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
  });

  const templates = useQuery(trpc.agency.templates.list.queryOptions({ projectId }));
  const snippets = (templates.data ?? []).filter((t) => t.kind === "text");
  const business = useQuery(trpc.project.business.get.queryOptions({ projectId }));
  const myName = useCurrentUser().data?.user?.name ?? null;

  const onSaved = (updated: Lead) => {
    queryClient.setQueryData(trpc.agency.leads.get.queryOptions({ projectId, id: lead.id }).queryKey, updated);
    void queryClient.invalidateQueries({ queryKey: trpc.agency.leads.list.pathKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.agency.leads.stats.pathKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.agency.inbox.pathKey() });
  };

  const update = useMutation(
    trpc.agency.leads.update.mutationOptions({
      onSuccess: (updated) => {
        onSaved(updated);
        toast.success("Lead saved.");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const setStatus = (status: AgencyLeadStatus) => {
    if (status === lead.status) return;
    if (status === "won") return setStatusDialog("won");
    if (status === "lost") return setStatusDialog("lost");
    update.mutate({ projectId, id: lead.id, status });
  };

  const phone = toE164(lead.phone);
  const notesDirty = notes !== (lead.notes ?? "");

  return (
    <div className="flex flex-col">
      <Section
        title="Contact"
        action={
          canEdit && !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[13px] font-medium text-coral-text hover:text-coral-deep"
            >
              Edit
            </button>
          ) : undefined
        }
      >
        {editing ? (
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate(
                { projectId, id: lead.id, ...contact },
                { onSuccess: () => setEditing(false) }
              );
            }}
          >
            <Field label="Name">
              <Input value={contact.name} maxLength={200} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={contact.email} maxLength={320} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={contact.phone} maxLength={50} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </Field>
            {contact.phone.trim() && !toE164(contact.phone) && (
              <p className="text-xs text-dim">This number can&apos;t receive texts. Use a 10-digit US number.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="dark" type="submit" disabled={update.isPending}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <>
            <Row label="Name" value={lead.name} />
            <Row
              label="Email"
              value={lead.email}
              action={lead.email ? () => copy(lead.email!, "Email") : undefined}
            />
            <Row
              label="Phone"
              value={lead.phone ? formatPhone(phone ?? lead.phone) : null}
              action={lead.phone ? () => copy(phone ?? lead.phone!, "Phone") : undefined}
            />
          </>
        )}
      </Section>

      <Section title="Status">
        <div className="grid grid-cols-3 gap-1.5">
          {LEAD_STATUSES.map((option) => {
            const active = lead.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                disabled={!canEdit || update.isPending}
                onClick={() => setStatus(option.value)}
                className={cn(
                  "h-8 rounded-control border text-[13px] font-medium transition-colors disabled:opacity-60",
                  active
                    ? option.value === "won"
                      ? "border-transparent bg-success-soft text-success-text"
                      : "border-transparent bg-ink text-white"
                    : "border-line-strong bg-surface text-ink-3 hover:bg-canvas"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {lead.status === "won" && lead.valueCents != null && (
          <p className="text-[13px] text-dim">Deal value {formatMoney(lead.valueCents, lead.currency)}</p>
        )}
      </Section>

      <Section title="Appointment">
        {lead.meetingAt ? (
          <MeetingCard projectId={projectId} lead={lead} canEdit={canEdit} onSaved={onSaved} />
        ) : canEdit ? (
          <ScheduleButton projectId={projectId} lead={lead} onSaved={onSaved} />
        ) : (
          <p className="text-[13px] text-faint">None booked</p>
        )}
      </Section>

      <Section title="How they found you">
        <Row label="Entered via" value={entered(lead.source)} />
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-dim">Source</span>
          <ChannelBadge channel={lead.channel} />
        </div>
        <Row label="Received" value={format(new Date(lead.createdAt), "MMM d, yyyy 'at' p")} />
        {lead.formName && <Row label="Form" value={lead.formName} />}
        {Object.entries(lead.fields ?? {}).map(([key, val]) => (
          <Row key={key} label={key} value={val} />
        ))}
      </Section>

      <Section title="Notes">
        <TemplateTextarea
          rows={4}
          value={notes}
          disabled={!canEdit}
          onValueChange={setNotes}
          snippets={snippets}
          placeholders={false}
          aria-label="Notes"
          placeholder={snippets.length ? "Type / for a snippet" : "Only your team sees notes"}
          resolve={(text) =>
            resolveTemplate(text, placeholderValues({ lead, business: business.data, myName })).text
          }
        />
        {canEdit && notesDirty && (
          <Button
            size="sm"
            variant="dark"
            className="self-end"
            disabled={update.isPending}
            onClick={() => update.mutate({ projectId, id: lead.id, notes: notes || null })}
          >
            Save notes
          </Button>
        )}
      </Section>

      <div className="px-4 py-4">
        <a
          href={appPath(`leads/${lead.id}`)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-coral-text hover:text-coral-deep"
        >
          Full record
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      {statusDialog === "won" && (
        <MarkWonDialog
          projectId={projectId}
          lead={lead}
          onClose={() => setStatusDialog(null)}
          onDone={(updated) => {
            setStatusDialog(null);
            onSaved(updated);
          }}
        />
      )}
      {statusDialog === "lost" && (
        <MarkLostDialog
          projectId={projectId}
          lead={lead}
          onClose={() => setStatusDialog(null)}
          onDone={(updated) => {
            setStatusDialog(null);
            onSaved(updated);
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5 border-b border-divider px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, action }: { label: string; value: string | null; action?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="shrink-0 text-dim">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <span className={cn("break-words text-right", value ? "text-ink" : "text-faint")}>{value || "—"}</span>
        {action && (
          <button
            type="button"
            aria-label={`Copy ${label.toLowerCase()}`}
            onClick={action}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-control text-faint hover:bg-hover hover:text-ink"
          >
            <Copy className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}
