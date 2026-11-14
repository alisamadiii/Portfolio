"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Check, ChevronLeft, Copy, ExternalLink, Mail } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge } from "@/components/ds/ui/badge";
import { ButtonAnchor } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { EmptyState } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { useRouteProjectId } from "@/hooks/use-repo";
import { repoPath } from "@/lib/paths";
import { handleCmsError } from "@/lib/trpc-errors";

import { emailBadge } from "./resend-page";

const when = (iso: string | null) => {
  if (!iso) return "—";
  // Resend returns "2026-04-03 22:13:42.674981+00".
  const date = parseISO(iso.replace(" ", "T").replace(/\+00$/, "Z"));
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy 'at' h:mm a");
};

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex max-w-full items-center gap-2 rounded-control border border-line bg-sidebar px-2.5 py-1 font-mono text-[12px] text-ink-3 hover:bg-canvas"
    >
      <span className="truncate">{id}</span>
      {copied ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
    </button>
  );
}

const TABS = [
  { id: "preview", label: "Preview" },
  { id: "text", label: "Plain text" },
  { id: "html", label: "HTML" },
];

/** One email sent from the client's Resend account: details + content. */
export function ResendEmailPage() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const { emailId } = useParams<{ emailId: string }>();
  const email = useQuery(
    trpc.resend.email.queryOptions({ projectId, emailId }, { enabled: !!emailId, retry: false })
  );
  const [tab, setTab] = useState("preview");

  const back = (
    <Link
      href={repoPath(projectId, "resend")}
      className="flex w-fit items-center gap-1 text-[13px] text-dim hover:text-ink"
    >
      <ChevronLeft className="size-4" />
      Resend
    </Link>
  );

  if (email.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <Skeleton className="h-[480px] rounded-card" />
      </div>
    );
  }
  if (email.isError) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <Card>
          <EmptyState
            icon={<Mail className="size-5" />}
            title="Couldn't load this email"
            text={handleCmsError(email.error, "Resend didn't answer. Try again in a moment.")}
          />
        </Card>
      </div>
    );
  }

  const e = email.data;
  const badge = emailBadge(e.status);
  const fields: [string, React.ReactNode][] = [
    ["From", e.from || "—"],
    ["To", e.to.join(", ") || "—"],
    ["Subject", e.subject || "—"],
    ["Sent", when(e.createdAt)],
    ...(e.replyTo.length ? [["Reply-to", e.replyTo.join(", ")] as [string, React.ReactNode]] : []),
    ...(e.cc.length ? [["Cc", e.cc.join(", ")] as [string, React.ReactNode]] : []),
    ...(e.bcc.length ? [["Bcc", e.bcc.join(", ")] as [string, React.ReactNode]] : []),
    ...(e.scheduledAt ? [["Scheduled", when(e.scheduledAt)] as [string, React.ReactNode]] : []),
    ["ID", <CopyId key="id" id={e.id} />],
  ];
  const tabs = TABS.filter((t) => (t.id === "text" ? !!e.text : t.id === "html" || t.id === "preview" ? !!e.html : true));
  const current = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="flex flex-col gap-6">
      {back}
      <PageHeader
        title={e.subject || "(no subject)"}
        description={`To ${e.to.join(", ") || "—"}`}
        actions={
          <ButtonAnchor
            href={`https://resend.com/emails/${e.id}`}
            target="_blank"
            rel="noreferrer"
            icon={<ExternalLink className="size-4" />}
          >
            Open in Resend
          </ButtonAnchor>
        }
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-divider px-6 py-4">
          <span className="text-[13px] text-dim">Status</span>
          <Badge tone={badge.tone} dot>
            {badge.label}
          </Badge>
        </div>
        <dl className="grid gap-x-8 gap-y-5 px-6 py-5 text-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-[13px] text-dim">{label}</dt>
              <dd className="min-w-0 break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {e.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-divider px-6 py-4">
            {e.tags.map((t) => (
              <Badge key={`${t.name}:${t.value}`} tone="neutral">
                {t.name}: {t.value}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card>
        {current ? (
          <>
            <div className="border-b border-divider px-6 py-3">
              <SegmentedTabs label="Email content" items={tabs} value={current} onChange={setTab} />
            </div>
            {current === "preview" && e.html && (
              // Sandboxed: no scripts, no same-origin access to the hub.
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={e.html}
                className="h-[640px] w-full bg-white"
              />
            )}
            {current === "text" && (
              <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap px-6 py-5 font-mono text-[13px] text-ink-3">
                {e.text}
              </pre>
            )}
            {current === "html" && (
              <pre className="max-h-[640px] overflow-auto px-6 py-5 font-mono text-[12px] text-ink-3">
                {e.html}
              </pre>
            )}
          </>
        ) : (
          <p className="px-6 py-8 text-center text-[13px] text-dim">Resend didn&apos;t keep this email&apos;s content.</p>
        )}
      </Card>
    </div>
  );
}
