"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowUpRight, Copy, Download, Handshake, Send, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { DEFAULT_COMMISSION_BPS, formatCents, formatRate } from "@workspace/trpc/lib/partners-shared";
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
// White wordmark on Mercury's dark, 2x (same file the approval email uses).
const MERCURY_WORDMARK = "https://cdn.alisamadii.com/third-party-services/mercury-wordmark-dark.png";

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
    { icon: <Wallet className="size-5" />, title: "Get paid", text: `Earn ${formatRate(DEFAULT_COMMISSION_BPS)} of their first website payment, after payment processing fees.` },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 px-6 py-7 sm:px-8">
        <IconTile size={48}>
          <Handshake className="size-6" />
        </IconTile>
        <div className="flex max-w-[620px] flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">
            Earn {formatRate(DEFAULT_COMMISSION_BPS)} when a business you refer pays for its website
          </h2>
          <p className="text-sm leading-relaxed text-dim">
            Know local business owners who need a website? Introduce them to us. When a business you referred pays for
            its website, you get {formatRate(DEFAULT_COMMISSION_BPS)} of that first payment, after payment processing fees. If they don&apos;t pay, there&apos;s no payout. You
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
        Paid per website, setup fee only. Amounts depend on the plan the business picks. This isn&apos;t an
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

/**
 * How the partner gets paid: by ACH to the bank account they add on
 * Mercury's form (invite emailed on approval). The invite link is theirs
 * alone; our DB never stores bank details (Ali sees them in Mercury). Mercury-themed on purpose: this
 * step happens on Mercury's site, like the approval email's card.
 */
function PayoutCard({ payout }: { payout: Partner["payout"] }) {
  const howItWorks = `${PARTNERS_SITE}/#get-paid`;
  const pill =
    "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mercury-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mercury-bg";
  const status =
    payout.state === "invited"
      ? { label: "Action needed", dot: "bg-mercury-accent" }
      : payout.state === "ready"
        ? { label: "Bank account on file", dot: "bg-success" }
        : payout.state === "expired"
          ? { label: "Link expired", dot: "bg-mercury-muted" }
          : null;
  return (
    <section className="flex flex-col gap-4 rounded-card border border-mercury-line bg-mercury-bg px-6 py-6 text-mercury-text">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <img src={MERCURY_WORDMARK} alt="Mercury" width={104} height={24} className="h-6 w-auto" />
        {status && (
          <span className="inline-flex items-center gap-2 rounded-full border border-mercury-line-strong bg-mercury-surface px-3 py-1 text-[13px] font-medium text-mercury-text-2">
            <span className={`size-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        )}
      </div>

      {payout.state === "not_invited" && (
        <>
          <p className="text-lg font-medium tracking-[-0.01em]">Payouts go straight to your bank</p>
          <p className="max-w-[620px] text-sm leading-relaxed text-mercury-text-2">
            We&apos;ll invite you through Mercury, our bank, to add the account you want paid. No Mercury account
            needed. Mercury holds your details; this site never stores them, and only we can view them in Mercury to send
            your payout.
          </p>
          <div>
            <a href={howItWorks} target="_blank" rel="noreferrer" className={`${pill} border border-mercury-line-strong bg-mercury-surface text-mercury-text hover:border-mercury-muted`}>
              How it works
            </a>
          </div>
        </>
      )}
      {payout.state === "invited" && (
        <>
          <p className="text-lg font-medium tracking-[-0.01em]">One thing to do now: add your bank account</p>
          <p className="max-w-[620px] text-sm leading-relaxed text-mercury-text-2">
            Mercury emailed you a secure link; you can also open it here. You don&apos;t need a Mercury account: click{" "}
            <strong className="font-semibold text-mercury-text">Skip</strong> on the first page and go straight to
            the bank form. Mercury holds your details; this site never stores them, and only we can view them in
            Mercury to send your payout.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {payout.inviteUrl && (
              <a href={payout.inviteUrl} target="_blank" rel="noreferrer" className={`${pill} bg-mercury-accent text-white hover:brightness-110`}>
                Add bank account
                <ArrowUpRight className="size-4" />
              </a>
            )}
            <a href={howItWorks} target="_blank" rel="noreferrer" className={`${pill} border border-mercury-line-strong bg-mercury-surface text-mercury-text hover:border-mercury-muted`}>
              How it works
            </a>
          </div>
        </>
      )}
      {payout.state === "ready" && (
        <>
          <p className="text-lg font-medium tracking-[-0.01em]">
            Your bank account is on file{payout.bankName ? ` at ${payout.bankName}` : ""}
          </p>
          <p className="max-w-[620px] text-sm leading-relaxed text-mercury-text-2">
            Payouts arrive by ACH within 14 days after the business pays. Nothing is taken out on the way.
          </p>
        </>
      )}
      {payout.state === "expired" && (
        <>
          <p className="text-lg font-medium tracking-[-0.01em]">Your Mercury link expired</p>
          <p className="max-w-[620px] text-sm leading-relaxed text-mercury-text-2">
            It ran out before your bank account was added. We&apos;ll send you a new one; reply to any of our emails if
            you need it sooner.
          </p>
        </>
      )}
    </section>
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
          action={
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{formatRate(partner.commissionBps)} commission</Badge>
              <Badge tone="success" dot>Partner since {day(partner.approvedAt)}</Badge>
            </span>
          }
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
            Businesses can enter your code on our quote form, mention it when we talk, or use your link. You earn {formatRate(partner.commissionBps)}
            of a referred business&apos;s first website payment after payment processing fees, sent after they pay.
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

      <PayoutCard payout={partner.payout} />

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
