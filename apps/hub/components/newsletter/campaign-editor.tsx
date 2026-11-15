"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Copy, Mail, Pause, Play, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { useTRPC } from "@workspace/trpc/client";
import { rate } from "@workspace/trpc/lib/newsletter-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Padded } from "@/components/ds/layout/padded";
import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { DataTable } from "@/components/ds/ui/data-table";
import { Field, Input, Select } from "@/components/ds/ui/field";
import { EmptyState, KpiGrid } from "@/components/ds/ui/misc";

import { EmailEditor, SaveStatus, useAutosave } from "./email-editor";
import { QueryError } from "./query-error";
import { CAMPAIGN_STATUS, pct, useNewsletter } from "./use-newsletter";

type Campaign = RouterOutputs["newsletter"]["campaigns"]["get"];

/** /newsletter/campaigns/[id]: the editor for drafts, the report once sent. */
export function CampaignPage({ campaignId }: { campaignId: string }) {
  const trpc = useTRPC();
  const { projectId, base } = useNewsletter();
  const campaign = useQuery({
    ...trpc.newsletter.campaigns.get.queryOptions({ projectId, campaignId }),
    refetchInterval: (q) =>
      q.state.data && ["SCHEDULED", "RUNNING"].includes(q.state.data.status) ? 15_000 : false,
  });

  if (campaign.error) {
    return (
      <Padded>
        <Card>
          <EmptyState
            icon={<Mail className="size-5" />}
            title="Campaign not found"
            text={campaign.error.message}
            action={<Link href={`${base}?tab=campaigns`} className="text-[13px] font-medium text-coral-text">Back to campaigns</Link>}
          />
        </Card>
      </Padded>
    );
  }
  if (!campaign.data) return <Padded><Card className="h-40 animate-pulse" /></Padded>;
  return campaign.data.status === "DRAFT" ? (
    <DraftEditor campaign={campaign.data} />
  ) : (
    <CampaignReport campaign={campaign.data} />
  );
}

function Toolbar({ campaign, children }: { campaign: Campaign; children?: React.ReactNode }) {
  const { base } = useNewsletter();
  const s = CAMPAIGN_STATUS[campaign.status] ?? { label: campaign.status, tone: "neutral" as const };
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
      <Link
        href={`${base}?tab=campaigns`}
        className="inline-flex items-center gap-1.5 text-[13px] text-dim hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Campaigns
      </Link>
      <span className="text-faint">/</span>
      <h1 className="min-w-0 truncate text-base font-semibold">{campaign.name}</h1>
      <Badge tone={s.tone} dot>
        {s.label}
      </Badge>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function DraftEditor({ campaign }: { campaign: Campaign }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId, base, canWrite } = useNewsletter();
  const [sendOpen, setSendOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const domain = useQuery(trpc.newsletter.domain.get.queryOptions({ projectId }));
  const lists = useQuery(trpc.newsletter.contacts.lists.queryOptions({ projectId }));
  const [listId, setListId] = useState(campaign.contactBookId ?? "");

  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [previewText, setPreviewText] = useState(campaign.previewText ?? "");
  const [fromName, setFromName] = useState(campaign.fromParts.fromName);
  const [localPart, setLocalPart] = useState(campaign.fromParts.localPart);

  const update = useMutation(trpc.newsletter.campaigns.update.mutationOptions());
  type Patch = Omit<Parameters<typeof update.mutateAsync>[0], "projectId" | "campaignId">;
  const autosave = useAutosave<Patch>((patch) =>
    update.mutateAsync({ projectId, campaignId: campaign.id, ...patch })
  );
  const saveMeta = (patch: Patch) => {
    autosave.queue(patch);
    void autosave.flush().catch((e: Error) => toast.error(e.message));
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });
  const schedule = useMutation(
    trpc.newsletter.campaigns.schedule.mutationOptions({
      onSuccess: (_d, vars) => {
        toast.success(vars.scheduledAt ? "Campaign scheduled" : "Sending now");
        setSendOpen(false);
        invalidate();
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const remove = useMutation(
    trpc.newsletter.campaigns.delete.mutationOptions({
      onSuccess: () => {
        invalidate();
        router.push(`${base}?tab=campaigns`);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const send = async (scheduledAt?: string) => {
    try {
      await autosave.flush();
    } catch {
      return;
    }
    schedule.mutate({ projectId, campaignId: campaign.id, scheduledAt });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar campaign={campaign}>
        <SaveStatus saving={autosave.saving} error={autosave.error} />
        {canWrite && (
          <>
            <Button size="sm" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            <Button variant="primary" size="sm" icon={<Send className="size-3.5" />} onClick={() => setSendOpen(true)}>
              Send
            </Button>
          </>
        )}
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-auto bg-canvas px-4 pb-16 pt-6 sm:px-10">
        <div className="mx-auto flex max-w-[720px] flex-col gap-4">
          <QueryError
            error={domain.error ?? lists.error}
            onRetry={() => {
              void domain.refetch();
              void lists.refetch();
            }}
          />
          <Card className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Campaign name">
              <Input value={name} disabled={!canWrite} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== campaign.name && saveMeta({ name })} />
            </Field>
            <Field label="From">
              <div className="flex items-center gap-1.5">
                <Input
                  aria-label="From name"
                  className="min-w-0"
                  placeholder="Your business"
                  value={fromName}
                  disabled={!canWrite}
                  onChange={(e) => setFromName(e.target.value)}
                  onBlur={() => saveMeta({ from: { fromName, localPart } })}
                />
                <Input
                  aria-label="From address"
                  className="w-[90px] min-w-0"
                  value={localPart}
                  disabled={!canWrite}
                  onChange={(e) => setLocalPart(e.target.value)}
                  onBlur={() => localPart.trim() && saveMeta({ from: { fromName, localPart } })}
                />
                <span className="shrink-0 text-[13px] text-dim">@{domain.data?.name ?? campaign.fromParts.domain}</span>
              </div>
            </Field>
            <Field label="Send to" className="sm:col-span-2">
              <Select
                value={listId}
                disabled={!canWrite}
                onChange={(e) => {
                  setListId(e.target.value);
                  saveMeta({ listId: e.target.value });
                }}
              >
                {!listId && <option value="">Choose a list</option>}
                {lists.data?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.subscribed.toLocaleString()} subscribed)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject" className="sm:col-span-2">
              <Input value={subject} disabled={!canWrite} onChange={(e) => setSubject(e.target.value)} onBlur={() => subject !== campaign.subject && saveMeta({ subject })} />
            </Field>
            <Field label="Preview text" optional hint="Shown next to the subject in most inboxes." className="sm:col-span-2">
              <Input value={previewText} disabled={!canWrite} onChange={(e) => setPreviewText(e.target.value)} onBlur={() => previewText !== (campaign.previewText ?? "") && saveMeta({ previewText })} />
            </Field>
          </Card>
          <EmailEditor
            initialContent={campaign.content}
            readOnly={!canWrite}
            onChange={(content) => autosave.queue({ content })}
          />
        </div>
      </div>
      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        pending={schedule.isPending}
        onSend={send}
        list={lists.data?.find((l) => l.id === listId)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        danger
        title="Delete this draft?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => remove.mutate({ projectId, campaignId: campaign.id })}
      />
    </div>
  );
}

function SendDialog({
  open,
  onOpenChange,
  pending,
  onSend,
  list,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSend: (scheduledAt?: string) => void;
  list?: { name: string; subscribed: number };
}) {
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState("");
  const subscribers = list?.subscribed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send campaign</DialogTitle>
          <DialogDescription>
            {subscribers == null
              ? "Goes to everyone subscribed to your list."
              : `Goes to ${subscribers.toLocaleString()} subscriber${subscribers === 1 ? "" : "s"} on ${list!.name}. Unsubscribed and blocked addresses are skipped.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" className="accent-coral" checked={when === "now"} onChange={() => setWhen("now")} />
            Send now
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" className="accent-coral" checked={when === "later"} onChange={() => setWhen("later")} />
            Schedule for later
          </label>
          {when === "later" && (
            <Input
              type="datetime-local"
              value={at}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setAt(e.target.value)}
            />
          )}
        </div>
        <DialogFooter>
          <Button
            variant="primary"
            disabled={pending || subscribers === 0 || (when === "later" && !at)}
            onClick={() => onSend(when === "later" ? new Date(at).toISOString() : undefined)}
          >
            {pending ? "Sending…" : when === "later" ? "Schedule" : "Send now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignReport({ campaign }: { campaign: Campaign }) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectId, base, canWrite } = useNewsletter();
  const recipients = useQuery(
    trpc.newsletter.campaigns.recipients.queryOptions({ projectId, campaignId: campaign.id })
  );
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });
  const onError = (e: { message: string }) => toast.error(e.message);
  const pause = useMutation(trpc.newsletter.campaigns.pause.mutationOptions({ onSuccess: invalidate, onError }));
  const resume = useMutation(trpc.newsletter.campaigns.resume.mutationOptions({ onSuccess: invalidate, onError }));
  const duplicate = useMutation(
    trpc.newsletter.campaigns.duplicate.mutationOptions({
      onSuccess: ({ id }) => {
        invalidate();
        router.push(`${base}/campaigns/${id}`);
      },
      onError,
    })
  );

  const d = campaign.delivered;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar campaign={campaign}>
        {canWrite && (
          <>
            {["RUNNING", "SCHEDULED"].includes(campaign.status) && (
              <Button size="sm" icon={<Pause className="size-3.5" />} disabled={pause.isPending} onClick={() => pause.mutate({ projectId, campaignId: campaign.id })}>
                Pause
              </Button>
            )}
            {campaign.status === "PAUSED" && (
              <Button size="sm" icon={<Play className="size-3.5" />} disabled={resume.isPending} onClick={() => resume.mutate({ projectId, campaignId: campaign.id })}>
                Resume
              </Button>
            )}
            <Button size="sm" icon={<Copy className="size-3.5" />} disabled={duplicate.isPending} onClick={() => duplicate.mutate({ projectId, campaignId: campaign.id })}>
              Duplicate
            </Button>
          </>
        )}
      </Toolbar>
      <Padded>
        <p className="text-[13px] text-dim">
          “{campaign.subject}” from {campaign.from}
          {campaign.scheduledAt && ` · ${campaign.status === "SCHEDULED" ? "sends" : "sent"} ${format(new Date(campaign.scheduledAt), "MMM d, yyyy h:mm a")}`}
        </p>
        <KpiGrid
          items={[
            { label: "Recipients", value: campaign.total.toLocaleString() },
            { label: "Delivered", value: d.toLocaleString(), sub: pct(rate(d, campaign.total)) },
            { label: "Opened", value: campaign.opened.toLocaleString(), sub: pct(rate(campaign.opened, d)) },
            { label: "Clicked", value: campaign.clicked.toLocaleString(), sub: pct(rate(campaign.clicked, d)) },
            { label: "Unsubscribed", value: campaign.unsubscribed.toLocaleString() },
            { label: "Bounced", value: campaign.bounced.toLocaleString() },
          ]}
        />
        <QueryError error={recipients.error} onRetry={() => void recipients.refetch()} />
        <Card>
          <CardHeader title="Latest recipients" divided />
          <DataTable
            columns={[
              { key: "to", header: "Email", cell: (r) => r.to.join(", ") },
              {
                key: "status",
                header: "Status",
                width: "140px",
                cell: (r) => <Badge tone="neutral">{r.latestStatus.toLowerCase().replace(/_/g, " ")}</Badge>,
              },
              {
                key: "at",
                header: "Updated",
                width: "160px",
                align: "end",
                cell: (r) => format(new Date(r.updatedAt), "MMM d, h:mm a"),
              },
            ]}
            rows={recipients.data ?? []}
            rowKey={(r) => r.id}
            minWidth={520}
            empty={<div className="px-6 py-10 text-center text-[13px] text-faint">{recipients.isLoading ? "Loading…" : "No emails yet"}</div>}
          />
        </Card>
        {campaign.html && (
          <Card>
            <CardHeader title="Email" divided />
            <iframe
              title="Campaign preview"
              sandbox=""
              srcDoc={campaign.html}
              className="h-[640px] w-full rounded-b-card bg-white"
            />
          </Card>
        )}
      </Padded>
    </div>
  );
}
