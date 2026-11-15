"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Globe, Send } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@workspace/ui/components/switch";
import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Field, Input } from "@/components/ds/ui/field";
import { IconTile } from "@/components/ds/ui/misc";

import { useNewsletter } from "./use-newsletter";

type Domain = NonNullable<RouterOutputs["newsletter"]["domain"]["get"]>;

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  SUCCESS: { label: "Verified", tone: "success" },
  PENDING: { label: "Pending", tone: "info" },
  NOT_STARTED: { label: "Not started", tone: "neutral" },
  FAILED: { label: "Failed", tone: "coral" },
  TEMPORARY_FAILURE: { label: "Retrying", tone: "warning" },
};
const status = (s: string) => STATUS[s] ?? { label: s, tone: "neutral" as const };

/** The project's one sending domain: add it, publish the DNS records, verify. */
export function DomainSection() {
  const trpc = useTRPC();
  const { projectId, canManage } = useNewsletter();
  const domain = useQuery({
    ...trpc.newsletter.domain.get.queryOptions({ projectId }),
    // Verification runs in the background; keep checking until it settles.
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s && s !== "SUCCESS" && s !== "FAILED" ? 10_000 : false;
    },
  });

  if (domain.isLoading) {
    return <Card className="h-40 animate-pulse" />;
  }
  if (!domain.data) return <AddDomain canManage={canManage} />;
  return <DomainDetail domain={domain.data} canManage={canManage} />;
}

function AddDomain({ canManage }: { canManage: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const create = useMutation(
    trpc.newsletter.domain.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() }),
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <Card className="flex flex-col gap-4 p-6">
      <IconTile>
        <Globe className="size-5" strokeWidth={1.8} />
      </IconTile>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Send from your own domain</h2>
        <p className="max-w-xl text-[13px] leading-normal text-dim">
          Newsletters go out from an address on your domain, like news@yourbusiness.com. You add a
          few DNS records once, and every email is signed as you. One domain per project.
        </p>
      </div>
      {canManage ? (
        <form
          className="flex max-w-lg flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(new FormData(event.currentTarget).get("name") ?? "");
            create.mutate({ projectId, name });
          }}
        >
          <Field label="Domain" hint="We recommend a subdomain, like mail.yourbusiness.com." className="min-w-[240px] flex-1">
            <Input name="name" required placeholder="mail.yourbusiness.com" autoComplete="off" />
          </Field>
          <Button variant="primary" type="submit" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add domain"}
          </Button>
        </form>
      ) : (
        <p className="text-[13px] text-dim">Ask the project owner to add the domain.</p>
      )}
    </Card>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="group flex min-w-0 items-center gap-1.5 text-left font-mono text-[12px] text-ink-3 hover:text-ink"
      title={value}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-success" />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-0 group-hover:opacity-100" />
      )}
    </button>
  );
}

function DomainDetail({ domain, canManage }: { domain: Domain; canManage: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.newsletter.pathKey() });

  const verify = useMutation(
    trpc.newsletter.domain.verify.mutationOptions({
      onSuccess: () => {
        toast.success("Checking your DNS records. This can take a few minutes.");
        refresh();
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const sendTest = useMutation(
    trpc.newsletter.domain.sendTest.mutationOptions({
      onSuccess: ({ to }) => toast.success(`Test email sent to ${to}`),
      onError: (e) => toast.error(e.message),
    })
  );
  const tracking = useMutation(
    trpc.newsletter.domain.setTracking.mutationOptions({
      onSuccess: refresh,
      onError: (e) => toast.error(e.message),
    })
  );
  const remove = useMutation(
    trpc.newsletter.domain.delete.mutationOptions({
      onSuccess: refresh,
      onError: (e) => toast.error(e.message),
    })
  );

  const s = status(domain.status);
  const verified = domain.status === "SUCCESS";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{domain.name}</h2>
        <Badge tone={s.tone} dot>
          {s.label}
        </Badge>
        {canManage && (
          <div className="ml-auto flex gap-2">
            <Button disabled={verify.isPending} onClick={() => verify.mutate({ projectId })}>
              Verify again
            </Button>
            <Button
              variant="primary"
              icon={<Send className="size-3.5" />}
              disabled={!verified || sendTest.isPending}
              onClick={() => sendTest.mutate({ projectId })}
            >
              Send test email
            </Button>
          </div>
        )}
      </div>

      {!verified && (
        <p className="text-[13px] text-dim">
          Add these records at your domain provider (GoDaddy, Namecheap, Cloudflare…). Verification
          usually finishes within an hour; this page updates on its own.
        </p>
      )}

      <Card>
        <CardHeader title="DNS records" divided />
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid h-[38px] grid-cols-[70px_minmax(0,1.2fr)_minmax(0,2fr)_60px_70px_110px] items-center gap-3 border-b border-divider bg-sidebar px-6 text-xs font-medium text-dim">
              <span>Type</span>
              <span>Name</span>
              <span>Content</span>
              <span>TTL</span>
              <span>Priority</span>
              <span>Status</span>
            </div>
            {domain.dnsRecords.map((r) => {
              const rs = status(r.status);
              return (
                <div
                  key={`${r.type}-${r.name}-${r.value}`}
                  className="grid min-h-[56px] grid-cols-[70px_minmax(0,1.2fr)_minmax(0,2fr)_60px_70px_110px] items-center gap-3 border-b border-divider px-6 text-[13px] last:border-b-0"
                >
                  <span className="font-medium">{r.type}</span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    {r.recommended && <span className="shrink-0 text-xs text-faint">(recommended)</span>}
                    <CopyValue value={r.name} />
                  </div>
                  <CopyValue value={r.value} />
                  <span className="text-ink-3">{r.ttl}</span>
                  <span className="text-ink-3">{r.priority ?? ""}</span>
                  <span>
                    <Badge tone={rs.tone}>{rs.label}</Badge>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Settings" divided />
        <div className="flex flex-col divide-y divide-divider">
          <label className="flex items-start justify-between gap-6 px-6 py-4">
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Click tracking</span>
              <span className="text-[13px] text-dim">See which links people click in your emails.</span>
            </span>
            <Switch
              checked={domain.clickTracking}
              disabled={!canManage || tracking.isPending}
              onCheckedChange={(checked) => tracking.mutate({ projectId, clickTracking: checked })}
            />
          </label>
          <label className="flex items-start justify-between gap-6 px-6 py-4">
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Open tracking</span>
              <span className="max-w-xl text-[13px] text-dim">
                Adds an invisible pixel so you can see how many people open your emails. It can
                slightly lower inbox placement.
              </span>
            </span>
            <Switch
              checked={domain.openTracking}
              disabled={!canManage || tracking.isPending}
              onCheckedChange={(checked) => tracking.mutate({ projectId, openTracking: checked })}
            />
          </label>
        </div>
      </Card>

      {canManage && (
        <Card className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-danger">Delete domain</span>
            <p className="text-[13px] text-dim">
              Campaigns stop sending from {domain.name}. You can add a different domain after.
            </p>
          </div>
          <Button disabled={remove.isPending} onClick={() => setConfirmDelete(true)}>
            Delete domain
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        danger
        title={`Delete ${domain.name}?`}
        description="Scheduled campaigns from this domain won't send. This can't be undone."
        confirmLabel="Delete domain"
        onConfirm={() => remove.mutate({ projectId })}
      />
    </>
  );
}
