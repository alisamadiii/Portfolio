"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import type { AgencyLeadStatus } from "@workspace/drizzle/schema";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/use-agency";
import { LEAD_STATUSES, LeadStatusBadge } from "@/components/agency/lead-status";
import { ArrowLeft, CircleCheck, Mail, Phone, TriangleAlert } from "@/components/icon";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-4 border-b py-2.5 text-[14px] last:border-b-0">
    <span className="text-muted-foreground w-36 shrink-0">{label}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

export function LeadDetail({ id }: { id: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId, role } = useAgency();
  const canEdit = role !== "view-only";

  const { data: lead, isLoading, error } = useQuery(
    trpc.agency.leads.get.queryOptions({ repoId, id })
  );

  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (!lead) return;
    setValue(lead.valueCents ? String(lead.valueCents / 100) : "");
    setNotes(lead.notes ?? "");
  }, [lead]);

  const onSaved = (updated: NonNullable<typeof lead>) => {
    queryClient.setQueryData(
      trpc.agency.leads.get.queryOptions({ repoId, id }).queryKey,
      updated
    );
    queryClient.invalidateQueries({ queryKey: trpc.agency.leads.list.pathKey() });
    queryClient.invalidateQueries({ queryKey: trpc.agency.leads.stats.pathKey() });
  };

  const update = useMutation(
    trpc.agency.leads.update.mutationOptions({
      onSuccess: (updated) => {
        onSaved(updated);
        toast.success("Lead saved.");
      },
      onError: (err) => toast.error(err.message),
    })
  );
  const retry = useMutation(
    trpc.agency.leads.retryConversion.mutationOptions({
      onSuccess: onSaved,
      onError: (err) => toast.error(err.message),
    })
  );

  if (error) {
    return <p className="text-muted-foreground">{error.message}</p>;
  }
  if (isLoading || !lead) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  const valueCents = value.trim() ? Math.round(Number(value) * 100) : null;
  const valueInvalid = valueCents !== null && (!Number.isFinite(valueCents) || valueCents < 0);
  const fromAds = Boolean(lead.gclid || lead.gbraid || lead.wbraid);

  const save = (status: AgencyLeadStatus = lead.status) =>
    update.mutate({ repoId, id, status, valueCents, notes: notes || null });

  return (
    <div className="space-y-6">
      <Link
        href="/agency"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px]"
      >
        <ArrowLeft className="size-4" />
        All leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[27px] font-extrabold tracking-tight">
            {lead.name || lead.email || lead.phone || `Lead #${lead.id}`}
          </h2>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {format(new Date(lead.createdAt), "PPP 'at' p")}
            {lead.formName ? ` · ${lead.formName}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {lead.phone && (
            <Button variant="outline" size="sm" render={<a href={`tel:${lead.phone}`} />}>
              <Phone className="size-4" />
              Call
            </Button>
          )}
          {lead.email && (
            <Button variant="outline" size="sm" render={<a href={`mailto:${lead.email}`} />}>
              <Mail className="size-4" />
              Email
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="bg-card rounded-lg border px-5 py-2">
            {lead.email && <Field label="Email">{lead.email}</Field>}
            {lead.phone && <Field label="Phone">{lead.phone}</Field>}
            {lead.message && (
              <Field label="Message">
                <span className="whitespace-pre-wrap">{lead.message}</span>
              </Field>
            )}
            {Object.entries(lead.fields ?? {}).map(([key, val]) => (
              <Field key={key} label={key}>
                {val}
              </Field>
            ))}
          </section>

          <section className="bg-card rounded-lg border px-5 py-2">
            <p className="text-muted-foreground pt-2 pb-1 text-[12px] font-medium tracking-wide uppercase">
              Where it came from
            </p>
            <Field label="Source">
              {fromAds ? "Google Ads" : lead.source === "manual" ? "Added by hand" : "Website"}
            </Field>
            {lead.utm?.campaign && <Field label="Campaign">{lead.utm.campaign}</Field>}
            {lead.utm?.term && <Field label="Keyword">{lead.utm.term}</Field>}
            {lead.utm?.source && !fromAds && (
              <Field label="UTM source">
                {lead.utm.source}
                {lead.utm.medium ? ` / ${lead.utm.medium}` : ""}
              </Field>
            )}
            {lead.pageUrl && <Field label="Page">{lead.pageUrl}</Field>}
            {lead.referrer && <Field label="Referrer">{lead.referrer}</Field>}
          </section>
        </div>

        <aside className="bg-card h-fit space-y-4 rounded-lg border p-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold">Status</span>
            <LeadStatusBadge status={lead.status} />
          </div>

          <Select
            value={lead.status}
            disabled={!canEdit || update.isPending}
            onValueChange={(status) => save(status as AgencyLeadStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="space-y-1.5">
            <Label htmlFor="lead-value">Deal value ({lead.currency})</Label>
            <Input
              id="lead-value"
              inputMode="decimal"
              placeholder="0"
              value={value}
              disabled={!canEdit}
              onChange={(event) => setValue(event.target.value)}
            />
            <p className="text-muted-foreground text-[12px]">
              When a lead is won, its value is reported to Google Ads so your
              ads learn which searches turn into paying customers.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              rows={4}
              value={notes}
              disabled={!canEdit}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {canEdit && (
            <Button
              className="w-full"
              disabled={update.isPending || valueInvalid}
              onClick={() => save()}
            >
              Save
            </Button>
          )}

          {lead.status === "won" && (
            <div className="border-t pt-4 text-[13px]">
              {lead.conversionUploadedAt ? (
                <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CircleCheck className="size-4" />
                  Reported to Google Ads
                </p>
              ) : lead.conversionError ? (
                <div className="space-y-2">
                  <p className="text-destructive flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {lead.conversionError}
                  </p>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retry.isPending}
                      onClick={() => retry.mutate({ repoId, id })}
                    >
                      Try again
                    </Button>
                  )}
                </div>
              ) : !lead.valueCents ? (
                <p className="text-muted-foreground">
                  Add a deal value to report this sale to Google Ads.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Not reported to Google Ads (no ads account linked yet).
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
