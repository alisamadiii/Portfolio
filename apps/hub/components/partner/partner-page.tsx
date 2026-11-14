"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowUpRight, Copy, Download, Handshake, Send, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { formatCents } from "@workspace/trpc/lib/partners-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { type Column, DataTable } from "@/components/ds/ui/data-table";
import { EmptyState, IconTile, KpiGrid } from "@/components/ds/ui/misc";
import { handleCmsError } from "@/lib/trpc-errors";

type Partner = NonNullable<RouterOutputs["partners"]["me"]>;
type Referral = Partner["referrals"][number];

const PARTNERS_SITE =
  process.env.NODE_ENV === "development" ? "http://localhost:5173" : "https://partners.alisamadii.com";
const AGENCY_SITE = "https://www.alisamadii.com";

const day = (d: Date | string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "—");

const REFERRAL_STATUS: Record<Referral["status"], { label: string; tone: BadgeTone }> = {
  new: { label: "New", tone: "neutral" },
  talking: { label: "In talks", tone: "info" },
  won: { label: "Signed", tone: "success" },
  lost: { label: "Didn't sign", tone: "neutral" },
};

const copy = (text: string, label: string) =>
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied.`),
    () => toast.error("Couldn't copy.")
  );

/** Account-level Partner Program page: the program pitch, or the partner's code and referrals. */
export function PartnerPage() {
  const trpc = useTRPC();
  const me = useQuery(trpc.partners.me.queryOptions());

  if (me.isPending) return <Skeleton className="h-[320px] rounded-card" />;
  if (me.isError) {
    return (
      <Card className="px-6 py-6 text-[13px] text-dim">
        {handleCmsError(me.error, "Couldn't load your partner account.")}
      </Card>
    );
  }
  if (!me.data) return <NotPartner />;
  if (me.data.status === "approved") return <ApprovedPartner partner={me.data} />;
  return <Application partner={me.data} />;
}

function NotPartner() {
  const steps = [
    { icon: <UserPlus className="size-5" />, title: "Apply", text: "Tell us a bit about you. We review every application by hand." },
    { icon: <Send className="size-5" />, title: "Refer", text: "Share your code with a local business that needs a website." },
    { icon: <Wallet className="size-5" />, title: "Get paid", text: "Earn 40% of their first website payment, after they pay." },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 px-6 py-7 sm:px-8">
        <IconTile size={48}>
          <Handshake className="size-6" />
        </IconTile>
        <div className="flex max-w-[620px] flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">
            Earn 40% when a business you refer pays for its website
          </h2>
          <p className="text-sm leading-relaxed text-dim">
            Know local business owners who need a website? Introduce them to us. When a business you referred pays for
            its website, you get 40% of that first payment. If they don&apos;t pay, there&apos;s no payout. You
            don&apos;t earn from the monthly subscription, and joining is free.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonAnchor
            variant="primary"
            href={`${PARTNERS_SITE}/apply`}
            trailingIcon={<ArrowUpRight className="size-4" />}
          >
            Apply to become a partner
          </ButtonAnchor>
          <ButtonAnchor href={PARTNERS_SITE} target="_blank" rel="noreferrer">
            How it works
          </ButtonAnchor>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <Card key={s.title} className="flex flex-col gap-3 px-6 py-5">
            <IconTile tone="neutral">{s.icon}</IconTile>
            <span className="text-base font-semibold">
              {i + 1}. {s.title}
            </span>
            <p className="text-[13px] leading-normal text-dim">{s.text}</p>
          </Card>
        ))}
      </div>
      <p className="text-[13px] text-dim">
        One-time payout per paying client. Amounts depend on the plan the business picks. This isn&apos;t an
        employment offer.
      </p>
    </div>
  );
}

function Application({ partner }: { partner: Partner }) {
  const pending = partner.status === "pending";
  return (
    <Card className="flex flex-col gap-3 px-6 py-6">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold">
          {pending ? "Application received" : "Application not approved"}
        </span>
        <Badge tone={pending ? "warning" : "neutral"} dot>
          {pending ? "In review" : "Not approved"}
        </Badge>
      </div>
      <p className="max-w-[620px] text-sm leading-relaxed text-dim">
        {pending
          ? `You applied on ${day(partner.createdAt)}. We review every application by hand and will email you with your referral code once you're approved.`
          : "We couldn't approve your application this time. Thanks again for your interest. If anything changes on our side, we'll reach out."}
      </p>
      {partner.agreementUrl && (
        <div>
          <ButtonAnchor size="sm" href={partner.agreementUrl} icon={<Download className="size-3.5" />}>
            Signed agreement
          </ButtonAnchor>
        </div>
      )}
    </Card>
  );
}

function ApprovedPartner({ partner }: { partner: Partner }) {
  const code = partner.code ?? "";
  const link = `${AGENCY_SITE}/?ref=${encodeURIComponent(code)}`;
  const { stats } = partner;

  const columns: Column<Referral>[] = [
    {
      key: "business",
      header: "Business",
      width: "1.6fr",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="truncate font-medium text-ink">{r.businessName}</span>
          <span className="text-xs text-dim">Referred {day(r.createdAt)}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <Badge tone={REFERRAL_STATUS[r.status].tone}>{REFERRAL_STATUS[r.status].label}</Badge>,
    },
    {
      key: "payout",
      header: "Your payout",
      cell: (r) => (r.commissionCents != null && r.clientPaidAt ? formatCents(r.commissionCents) : "—"),
    },
    {
      key: "paid",
      header: "Paid to you",
      cell: (r) =>
        r.partnerPaidAt ? (
          <Badge tone="success" dot>
            {day(r.partnerPaidAt)}
          </Badge>
        ) : r.clientPaidAt ? (
          <Badge tone="warning" dot>
            On the way
          </Badge>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Your referral code"
          divided
          action={<Badge tone="success" dot>Partner since {day(partner.approvedAt)}</Badge>}
        />
        <div className="flex flex-col gap-4 px-6 py-5">
          <button
            type="button"
            onClick={() => copy(code, "Code")}
            className="flex w-fit items-center gap-3 rounded-control border border-line border-l-[3px] border-l-coral px-4 py-3 font-mono text-xl font-bold tracking-wider text-ink hover:bg-canvas"
          >
            {code}
            <Copy className="size-4 text-dim" />
          </button>
          <p className="max-w-[620px] text-[13px] leading-normal text-dim">
            Businesses can enter your code on our quote form, mention it when we talk, or use your link. You earn 40%
            of a referred business&apos;s first website payment, sent after they pay.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-control bg-canvas px-3 py-2 text-[13px] text-ink-3">{link}</code>
            <ButtonAnchor size="sm" href="#" onClick={(e) => (e.preventDefault(), void copy(link, "Link"))} icon={<Copy className="size-3.5" />}>
              Copy link
            </ButtonAnchor>
            {partner.agreementUrl && (
              <ButtonAnchor size="sm" href={partner.agreementUrl} icon={<Download className="size-3.5" />}>
                Signed agreement
              </ButtonAnchor>
            )}
          </div>
        </div>
      </Card>

      <KpiGrid
        items={[
          { label: "Businesses referred", value: String(stats.referrals) },
          { label: "Paying clients", value: String(stats.paying) },
          { label: "On the way to you", value: formatCents(stats.owedCents) },
          { label: "Paid to you", value: formatCents(stats.paidCents), sub: `${stats.paidOut} payouts` },
        ]}
      />

      <Card className="overflow-hidden">
        <CardHeader title="Your referrals" divided />
        <DataTable
          columns={columns}
          rows={partner.referrals}
          rowKey={(r) => String(r.id)}
          minWidth={560}
          empty={
            <EmptyState
              icon={<Send className="size-5" />}
              title="No referrals yet"
              text="When a business uses your code or names you, it shows up here. Payouts appear once the business pays for its website."
            />
          }
        />
      </Card>
    </div>
  );
}
