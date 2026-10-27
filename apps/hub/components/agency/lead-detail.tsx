"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { referrerHost } from "@workspace/trpc/lib/agency/lead-channel";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import type { AgencyLeadStatus } from "@workspace/drizzle/schema";

import {
  CancelBookingDialog,
  RescheduleDialog,
} from "@/components/agency/booking-dialogs";
import {
  MarkLostDialog,
  MarkWonDialog,
} from "@/components/agency/lead-status-dialogs";
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
import { FrameCard } from "@/components/agency/page-shell";
import { useAgency, useAgencyHref } from "@/components/agency/use-agency";
import {
  ArrowLeft,
  CircleCheck,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  TriangleAlert,
} from "@/components/icon";

type Lead = RouterOutputs["agency"]["leads"]["get"];

const when = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "PPP 'at' p:ss") : null;

// Google processes uploads asynchronously; this is the confirmed outcome.
const accepted = (
  upload: { verified?: boolean; verifyError?: string } | undefined
) => (upload?.verified ? "Yes" : (upload?.verifyError ?? null));

/** Every stored attribute of a lead, raw, in capture order. */
const recorded = (lead: Lead): [string, string | null][] => [
  ["Lead ID", String(lead.id)],
  ["Received", when(lead.createdAt)],
  ["Last updated", when(lead.updatedAt)],
  [
    "Entered via",
    lead.source === "manual"
      ? "Added by hand"
      : lead.source === "booking"
        ? "Booked an appointment"
        : "Website form",
  ],
  ["Form name", lead.formName],
  ["Meeting", lead.booking?.typeName ?? null],
  ["Meeting at", when(lead.bookingAt)],
  ["Meeting canceled at", when(lead.bookingCanceledAt)],
  [
    "Meeting outcome",
    lead.bookingOutcome === "completed"
      ? "Completed"
      : lead.bookingOutcome === "no_show"
        ? "No-show"
        : null,
  ],
  ["Meeting rescheduled from", when(lead.booking?.rescheduledFrom)],
  ["Meet link", lead.booking?.meetUrl ?? null],
  ["Calendar event", lead.booking?.htmlLink ?? null],
  ["Calendar event error", lead.booking?.eventError ?? null],
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
  ["Contacted at", when(lead.contactedAt)],
  ["Qualified at", when(lead.qualifiedAt)],
  ["Won at", when(lead.wonAt)],
  ["Lost at", when(lead.lostAt)],
  ["Lost reason", lead.lostReason],
  ["New lead reported to Google Ads at", when(lead.adsUploads?.lead?.at)],
  ["New lead upload error", lead.adsUploads?.lead?.error ?? null],
  ["New lead accepted by Google", accepted(lead.adsUploads?.lead)],
  ["Qualified reported to Google Ads at", when(lead.adsUploads?.qualified?.at)],
  ["Qualified upload error", lead.adsUploads?.qualified?.error ?? null],
  ["Qualified accepted by Google", accepted(lead.adsUploads?.qualified)],
  ["Closed deal reported to Google Ads at", when(lead.conversionUploadedAt)],
  ["Closed deal upload error", lead.conversionError],
  ["Closed deal accepted by Google", accepted(lead.adsUploads?.won)],
];

const titleCase = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

const copyText = (value: string, label: string) =>
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied.`))
    .catch(() => toast.error("Couldn't copy."));

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="border-foreground/7 flex gap-4 border-b py-2.5 text-[14px] last:border-b-0">
    <span className="text-muted-foreground w-36 shrink-0">{label}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

/** Reschedule / Cancel for a booking lead, reusing the booking dialogs. */
function MeetingCard({ lead, repoId }: { lead: Lead; repoId: number }) {
  const [rescheduling, setRescheduling] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const at = lead.bookingAt ? new Date(lead.bookingAt) : null;
  if (!at) return null;
  const upcoming = at >= new Date() && !lead.bookingCanceledAt;

  return (
    <FrameCard innerClassName="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-primary/16 flex size-14 flex-col items-center justify-center rounded-[12px] text-[#c2451f]">
            <span className="text-[11px] font-semibold uppercase">
              {format(at, "MMM")}
            </span>
            <span className="text-[22px] leading-none font-semibold">
              {format(at, "d")}
            </span>
          </div>
          <div>
            <p className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
              {lead.bookingCanceledAt
                ? "Canceled"
                : upcoming
                  ? `Upcoming · ${formatDistanceToNow(at)}`
                  : lead.bookingOutcome === "completed"
                    ? "Past · Completed"
                    : lead.bookingOutcome === "no_show"
                      ? "Past · No-show"
                      : "Past"}
            </p>
            <p className="mt-1 text-[18px] font-semibold">
              {lead.booking?.typeName ?? "Meeting"}
            </p>
            <p className="text-muted-foreground text-[15px]">
              {format(at, "EEEE, MMM d · p")}
            </p>
            <div className="mt-1 flex gap-3 text-[14px]">
              {lead.booking?.meetUrl && (
                <a
                  href={lead.booking.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 font-medium"
                >
                  Google Meet <ExternalLink className="size-3.5" />
                </a>
              )}
              {lead.booking?.htmlLink && (
                <a
                  href={lead.booking.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Calendar <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
        {upcoming && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRescheduling(true)}
            >
              Reschedule
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCanceling(true)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {rescheduling && (
        <RescheduleDialog
          repoId={repoId}
          booking={lead}
          onClose={() => setRescheduling(false)}
          onDone={() => setRescheduling(false)}
        />
      )}
      {canceling && (
        <CancelBookingDialog
          repoId={repoId}
          booking={lead}
          onClose={() => setCanceling(false)}
          onDone={() => setCanceling(false)}
        />
      )}
    </FrameCard>
  );
}

export function LeadDetail({ id }: { id: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId, role } = useAgency();
  const href = useAgencyHref();
  const canEdit = role !== "view-only";

  const {
    data: lead,
    isLoading,
    error,
  } = useQuery(trpc.agency.leads.get.queryOptions({ repoId, id }));

  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [statusDialog, setStatusDialog] = useState<"won" | "lost" | null>(null);
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

  if (error) return <p className="text-muted-foreground">{error.message}</p>;
  if (isLoading || !lead)
    return <Skeleton className="h-[400px] w-full rounded-[18px]" />;

  const valueCents = value.trim() ? Math.round(Number(value) * 100) : null;
  const valueInvalid =
    valueCents !== null && (!Number.isFinite(valueCents) || valueCents < 0);
  const fromAds = lead.channel === "google_ads";
  const isBooking = lead.source === "booking" && Boolean(lead.bookingAt);

  const save = (status: AgencyLeadStatus = lead.status) =>
    update.mutate({ repoId, id, status, valueCents, notes: notes || null });

  const name = lead.name || lead.email || lead.phone || `Lead #${lead.id}`;

  // Status milestones in the order they happened, for the timeline.
  type StatusEvent = { at: string | Date; title: string; extra?: string };
  const statusEvents: StatusEvent[] = [];
  if (lead.contactedAt)
    statusEvents.push({ at: lead.contactedAt, title: "Contacted" });
  if (lead.qualifiedAt)
    statusEvents.push({ at: lead.qualifiedAt, title: "Qualified" });
  if (lead.wonAt)
    statusEvents.push({
      at: lead.wonAt,
      title: "Won",
      extra:
        lead.valueCents != null
          ? formatMoney(lead.valueCents, lead.currency)
          : undefined,
    });
  if (lead.lostAt)
    statusEvents.push({
      at: lead.lostAt,
      title: "Lost",
      extra: lead.lostReason ?? undefined,
    });
  statusEvents.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  return (
    <div className="flex flex-col gap-7">
      <Link
        href={href("/agency")}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-[15px] font-medium"
      >
        <ArrowLeft className="size-4" />
        All leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="bg-foreground/6 grid size-16 shrink-0 place-items-center rounded-full text-[22px] font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[40px] leading-none font-semibold tracking-[-0.03em]">
                {name}
              </h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-[15px]">
              {isBooking ? "Booked an appointment" : "Reached out"} ·{" "}
              {format(new Date(lead.createdAt), "PPP")}
              <ChannelBadge channel={lead.channel} />
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {lead.phone && (
            <Button
              variant="outline"
              render={<a href={`tel:${lead.phone}`} />}
            >
              <Phone className="size-4" />
              Call
            </Button>
          )}
          {lead.email && (
            <Button
              className="bg-foreground text-background"
              render={<a href={`mailto:${lead.email}`} />}
            >
              <Mail className="size-4" />
              Email
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {isBooking && <MeetingCard lead={lead} repoId={repoId} />}

          {/* Contact */}
          <section className="bg-card ring-foreground/7 flex flex-col gap-3 rounded-[18px] p-6 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
            <p className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
              Contact
            </p>
            {lead.email && (
              <ContactRow
                label="Email"
                value={lead.email}
                onCopy={() => copyText(lead.email!, "Email")}
              />
            )}
            {lead.phone && (
              <ContactRow
                label="Phone"
                value={lead.phone}
                onCopy={() => copyText(lead.phone!, "Phone")}
              />
            )}
            {lead.message && (
              <div className="border-foreground/7 border-t pt-3">
                <p className="text-muted-foreground text-[13px]">Message</p>
                <p className="mt-1 text-[15px] whitespace-pre-wrap">
                  {lead.message}
                </p>
              </div>
            )}
            {Object.entries(lead.fields ?? {}).map(([key, val]) => (
              <div key={key} className="border-foreground/7 border-t pt-3">
                <p className="text-muted-foreground text-[13px]">{key}</p>
                <p className="mt-1 text-[15px]">{val}</p>
              </div>
            ))}
          </section>

          {/* How they found you — timeline */}
          <section className="bg-card ring-foreground/7 flex flex-col gap-4 rounded-[18px] p-6 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                How {lead.name?.split(" ")[0] ?? "they"} found you
              </p>
              <ChannelBadge channel={lead.channel} withInfo />
            </div>
            <ol className="flex flex-col gap-4">
              {lead.firstTouch?.at && (
                <TimelineItem
                  tone="neutral"
                  title="First visit"
                  detail={`${format(new Date(lead.firstTouch.at), "PPP")} · ${
                    referrerHost(lead.firstTouch.referrer) ?? "direct"
                  }${
                    urlPath(lead.firstTouch.landing)
                      ? ` → ${urlPath(lead.firstTouch.landing)}`
                      : ""
                  }`}
                />
              )}
              {fromAds && (
                <TimelineItem
                  tone="accent"
                  title="Clicked an ad"
                  detail={
                    lead.adClick?.campaignName ??
                    lead.utm?.campaign ??
                    (lead.adClickCheckedAt
                      ? "Not found in Google Ads (click unverified)"
                      : "Matching with Google Ads (takes a few hours)")
                  }
                  extra={
                    (lead.adClick?.keyword ?? lead.utm?.term)
                      ? `"${lead.adClick?.keyword ?? lead.utm?.term}"${
                          lead.adClick?.matchType
                            ? ` · ${lead.adClick.matchType.toLowerCase()} match`
                            : ""
                        }${
                          lead.adClick?.device
                            ? ` · ${titleCase(lead.adClick.device)}`
                            : ""
                        }`
                      : undefined
                  }
                />
              )}
              <TimelineItem
                tone="charcoal"
                title={isBooking ? "Booked an appointment" : "Reached out"}
                detail={`${format(new Date(lead.createdAt), "PPP 'at' p")}${
                  lead.landingPage
                    ? ` · on ${urlPath(lead.landingPage) ?? lead.landingPage}`
                    : lead.pageUrl
                      ? ` · on ${urlPath(lead.pageUrl) ?? lead.pageUrl}`
                      : ""
                }`}
              />
              {isBooking && lead.bookingAt && (
                <TimelineItem
                  tone="accent"
                  title="Meeting"
                  detail={format(new Date(lead.bookingAt), "PPP 'at' p")}
                  last={statusEvents.length === 0}
                />
              )}
              {statusEvents.map((event, index) => (
                <TimelineItem
                  key={event.title}
                  tone={event.title === "Won" ? "accent" : "neutral"}
                  title={event.title}
                  detail={format(new Date(event.at), "PPP 'at' p")}
                  extra={event.extra}
                  last={index === statusEvents.length - 1}
                />
              ))}
            </ol>
          </section>

          {/* Raw record */}
          <details className="bg-card ring-foreground/7 rounded-[18px] px-6 py-4 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
            <summary className="flex cursor-pointer items-center justify-between font-mono text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
              Everything we recorded
              <span>{recorded(lead).filter(([, v]) => v).length} fields</span>
            </summary>
            <div className="mt-3">
              {recorded(lead).map(([label, val]) => (
                <Field key={label} label={label}>
                  {val ? (
                    <span className="font-mono text-[12.5px] break-all">
                      {val}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not recorded</span>
                  )}
                </Field>
              ))}
            </div>
          </details>
        </div>

        {/* Right rail */}
        <aside className="bg-card ring-foreground/7 flex h-fit flex-col gap-4 rounded-[18px] p-6 shadow-[0_6px_16px_rgba(27,26,23,0.05)] ring-1">
          <div>
            <p className="text-[15px] font-semibold">Status</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {LEAD_STATUSES.map((option) => {
                const active = lead.status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    disabled={!canEdit || update.isPending}
                    onClick={() =>
                      option.value === "won" && !active
                        ? setStatusDialog("won")
                        : option.value === "lost" && !active
                          ? setStatusDialog("lost")
                          : save(option.value)
                    }
                    className={cn(
                      "rounded-[10px] px-2 py-2 text-[13px] font-medium ring-1 transition-colors disabled:opacity-60",
                      active && option.value === "won"
                        ? "bg-[#e6efe4] text-[#2f6b3f] ring-[#2f6b3f]/30"
                        : active
                          ? "bg-foreground text-background ring-transparent"
                          : "ring-foreground/10 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-value">Deal value ({lead.currency})</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-[15px]">
                $
              </span>
              <Input
                id="lead-value"
                inputMode="decimal"
                placeholder="0"
                value={value}
                disabled={!canEdit}
                className="pl-7"
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
            <p className="text-muted-foreground text-[12px]">
              When a lead is won, its value is reported to Google Ads so your ads
              learn which searches turn into paying customers.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
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
            <div className="border-foreground/7 border-t pt-4 text-[13px]">
              {lead.conversionUploadedAt ? (
                <p className="flex items-center gap-2 text-[#2f6b3f]">
                  <CircleCheck className="size-4" />
                  Reported to Google Ads
                </p>
              ) : lead.conversionError ? (
                <div className="flex flex-col gap-2">
                  <p className="flex items-start gap-2 text-[#a3283a]">
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
              ) : lead.valueCents == null ? (
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

      {statusDialog === "won" && (
        <MarkWonDialog
          repoId={repoId}
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
          repoId={repoId}
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

function ContactRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-muted-foreground text-[13px]">{label}</p>
        <p className="truncate text-[15px]">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={onCopy}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

function TimelineItem({
  tone,
  title,
  detail,
  extra,
  last,
}: {
  tone: "neutral" | "accent" | "charcoal";
  title: string;
  detail: string;
  extra?: string;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "size-3 rounded-full ring-4",
            tone === "charcoal"
              ? "bg-foreground ring-foreground/10"
              : tone === "accent"
                ? "bg-primary ring-primary/15"
                : "bg-foreground/30 ring-foreground/5"
          )}
        />
        {!last && <span className="bg-foreground/10 w-px flex-1" />}
      </div>
      <div className={cn(!last && "pb-2")}>
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-muted-foreground text-[14px]">{detail}</p>
        {extra && <p className="text-muted-foreground text-[13px]">{extra}</p>}
      </div>
    </li>
  );
}
