"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

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
import { referrerHost } from "@workspace/trpc/lib/agency/lead-channel";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import type { AgencyLeadStatus } from "@workspace/drizzle/schema";

import {
  CHANNEL_LABELS,
  ChannelBadge,
  urlPath,
} from "@/components/agency/lead-channel";
import {
  formatMoney,
  LEAD_STATUSES,
  LeadStatusBadge,
  leadStatusLabel,
} from "@/components/agency/lead-status";
import { useAgency } from "@/components/agency/use-agency";
import {
  ArrowLeft,
  CircleCheck,
  Mail,
  Phone,
  TriangleAlert,
} from "@/components/icon";

type Lead = RouterOutputs["agency"]["leads"]["get"];

const when = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "PPP 'at' p:ss") : null;

/** Every stored attribute of a lead, raw, in capture order. */
const recorded = (lead: Lead): [string, string | null][] => [
  ["Lead ID", String(lead.id)],
  ["Received", when(lead.createdAt)],
  ["Last updated", when(lead.updatedAt)],
  ["Entered via", lead.source === "manual" ? "Added by hand" : "Website form"],
  ["Form name", lead.formName],
  ["Source", CHANNEL_LABELS[lead.channel]],
  ["Form page URL", lead.pageUrl],
  ["Landing page URL", lead.landingPage],
  ["Referrer", lead.referrer],
  ["UTM source", lead.utm?.source ?? null],
  ["UTM medium", lead.utm?.medium ?? null],
  ["UTM campaign", lead.utm?.campaign ?? null],
  ["UTM term", lead.utm?.term ?? null],
  ["UTM content", lead.utm?.content ?? null],
  ["Google click ID (gclid)", lead.gclid],
  ["iOS app click ID (gbraid)", lead.gbraid],
  ["iOS web click ID (wbraid)", lead.wbraid],
  ["Ad clicked at", when(lead.clickAt)],
  ["Campaign ID", lead.adClick?.campaignId ?? null],
  ["Campaign", lead.adClick?.campaignName ?? null],
  ["Ad group ID", lead.adClick?.adGroupId ?? null],
  ["Ad group", lead.adClick?.adGroupName ?? null],
  ["Keyword", lead.adClick?.keyword ?? null],
  ["Match type", lead.adClick?.matchType ?? null],
  ["Device", lead.adClick?.device ?? null],
  ["Matched with Google Ads at", when(lead.adClickCheckedAt)],
  ["First visit at", when(lead.firstTouch?.at)],
  ["First visit referrer", lead.firstTouch?.referrer || null],
  ["First visit landing page", lead.firstTouch?.landing ?? null],
  ["Status", leadStatusLabel(lead.status)],
  [
    "Deal value",
    lead.valueCents !== null
      ? formatMoney(lead.valueCents, lead.currency)
      : null,
  ],
  ["Currency", lead.currency],
  ["Won at", when(lead.wonAt)],
  ["New lead reported to Google Ads at", when(lead.adsUploads?.lead?.at)],
  ["New lead upload error", lead.adsUploads?.lead?.error ?? null],
  ["Qualified reported to Google Ads at", when(lead.adsUploads?.qualified?.at)],
  ["Qualified upload error", lead.adsUploads?.qualified?.error ?? null],
  ["Closed deal reported to Google Ads at", when(lead.conversionUploadedAt)],
  ["Closed deal upload error", lead.conversionError],
];

const titleCase = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
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

  const {
    data: lead,
    isLoading,
    error,
  } = useQuery(trpc.agency.leads.get.queryOptions({ repoId, id }));

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
    queryClient.invalidateQueries({
      queryKey: trpc.agency.leads.list.pathKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.agency.leads.stats.pathKey(),
    });
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
  const valueInvalid =
    valueCents !== null && (!Number.isFinite(valueCents) || valueCents < 0);
  const fromAds = lead.channel === "google_ads";

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
            <Button
              variant="outline"
              size="sm"
              render={<a href={`tel:${lead.phone}`} />}
            >
              <Phone className="size-4" />
              Call
            </Button>
          )}
          {lead.email && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={`mailto:${lead.email}`} />}
            >
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
            <div className="flex items-center justify-between pt-2 pb-1">
              <p className="text-muted-foreground text-[12px] font-medium tracking-wide uppercase">
                Where it came from
              </p>
              <ChannelBadge channel={lead.channel} withInfo />
            </div>
            {fromAds && (
              <>
                <Field label="Campaign">
                  {lead.adClick?.campaignName ?? lead.utm?.campaign ?? (
                    <span className="text-muted-foreground">
                      {lead.adClickCheckedAt
                        ? "Not found in Google Ads (click unverified)"
                        : "Matching with Google Ads (takes a few hours)"}
                    </span>
                  )}
                </Field>
                {lead.adClick?.adGroupName && (
                  <Field label="Ad group">{lead.adClick.adGroupName}</Field>
                )}
                {(lead.adClick?.keyword ?? lead.utm?.term) && (
                  <Field label="Keyword">
                    {lead.adClick?.keyword ?? lead.utm?.term}
                    {lead.adClick?.matchType && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {lead.adClick.matchType.toLowerCase()} match
                      </span>
                    )}
                  </Field>
                )}
                {lead.adClick?.device && (
                  <Field label="Device">{titleCase(lead.adClick.device)}</Field>
                )}
                {lead.clickAt && (
                  <Field label="Ad clicked">
                    {format(new Date(lead.clickAt), "PPP 'at' p")}
                  </Field>
                )}
              </>
            )}
            {lead.referrer && (
              <Field label="Came from">
                {referrerHost(lead.referrer) ?? lead.referrer}
              </Field>
            )}
            {lead.utm?.source && !fromAds && (
              <Field label="Campaign tag">
                {[lead.utm.source, lead.utm.medium, lead.utm.campaign]
                  .filter(Boolean)
                  .join(" / ")}
              </Field>
            )}
            {lead.landingPage && (
              <Field label="Landed on">
                {urlPath(lead.landingPage) ?? lead.landingPage}
              </Field>
            )}
            {lead.pageUrl && (
              <Field label="Form on">
                {urlPath(lead.pageUrl) ?? lead.pageUrl}
              </Field>
            )}
            {lead.firstTouch?.at && (
              <Field label="First visit">
                {format(new Date(lead.firstTouch.at), "PPP")}
                <span className="text-muted-foreground">
                  {" "}
                  · {referrerHost(lead.firstTouch.referrer) ?? "direct"}
                  {urlPath(lead.firstTouch.landing)
                    ? ` → ${urlPath(lead.firstTouch.landing)}`
                    : ""}
                </span>
              </Field>
            )}
          </section>

          <section className="bg-card rounded-lg border px-5 py-2">
            <p className="text-muted-foreground pt-2 pb-1 text-[12px] font-medium tracking-wide uppercase">
              Everything we recorded
            </p>
            {recorded(lead).map(([label, value]) => (
              <Field key={label} label={label}>
                {value ? (
                  <span className="font-mono text-[12.5px] break-all">
                    {value}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not recorded</span>
                )}
              </Field>
            ))}
          </section>
        </div>

        <aside className="bg-card h-fit space-y-4 rounded-lg border p-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold">Status</span>
            <LeadStatusBadge status={lead.status} />
          </div>

          <Select
            items={LEAD_STATUSES}
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
