"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Check, Copy, ExternalLink, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";

const MetaItem = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("min-w-0", className)}>
    <p className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase">
      {label}
    </p>
    <div className="mt-1.5 text-sm font-medium">{children}</div>
  </div>
);

const CopyIdChip = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success("Email ID copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="bg-muted hover:bg-muted/70 flex max-w-full items-center gap-2 rounded-md px-2.5 py-1 font-mono text-xs transition-colors"
      title={id}
    >
      <span className="truncate">{id}</span>
      {copied ? (
        <Check className="text-status-success size-3.5 shrink-0" />
      ) : (
        <Copy className="text-muted-foreground size-3.5 shrink-0" />
      )}
    </button>
  );
};

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();

  const {
    data: email,
    isLoading,
    error,
  } = useQuery(
    trpc.emails.get.queryOptions({ id }, { enabled: !!currentUser && !!id })
  );

  // The presigned URL dies in ~60s, so it's a mutation fetched fresh — once
  // for the inline preview, and again on every open-in-new-tab / retry.
  const view = useMutation(trpc.emails.getViewUrl.mutationOptions());
  const { mutate: loadPreview } = view;

  useEffect(() => {
    if (email) loadPreview({ id: email.id });
  }, [email?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openInNewTab = () => {
    // Open synchronously so popup blockers don't eat the tab.
    const tab = window.open("", "_blank");
    view.mutate(
      { id },
      {
        onSuccess: ({ url }) => {
          if (tab) tab.location.href = url;
        },
        onError: (mutationError) => {
          tab?.close();
          toast.error(mutationError.message);
        },
      }
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <DocumentTitle title="Email" />
        <BackLink />
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <h3 className="text-[22px] font-extrabold tracking-tight">
            Email not found
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 mb-5 max-w-[380px] text-[14.5px]">
            This email doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button
            className="rounded-full px-5"
            render={<Link href="/emails" />}
          >
            Back to Emails
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !email) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-7 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4.5 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-[60vh] w-full rounded-lg" />
      </div>
    );
  }

  const recipient =
    email.type === "contact" && email.visitorEmail
      ? email.visitorEmail
      : email.to.join(", ");

  return (
    <div className="space-y-6">
      <DocumentTitle title={email.subject} />
      <BackLink />

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="bg-status-success-bg text-status-success grid size-14 shrink-0 place-items-center rounded-2xl border border-green-500/50">
          <Mail className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">Email</p>
          <h2 className="truncate text-[27px] font-extrabold tracking-tight">
            {recipient}
          </h2>
        </div>
        <Button
          variant="outline"
          className="shrink-0 gap-2 rounded-full px-4"
          onClick={openInNewTab}
          isLoading={view.isPending}
        >
          <ExternalLink className="size-4" />
          Open
        </Button>
      </div>

      {/* ── Meta grid ── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        <MetaItem label="From">
          <p className="truncate" title={email.fromAddress}>
            {email.fromAddress}
          </p>
        </MetaItem>
        <MetaItem label="Subject">
          <p className="truncate" title={email.subject}>
            {email.subject}
          </p>
        </MetaItem>
        <MetaItem label="To">
          <p className="truncate" title={email.to.join(", ")}>
            {email.to.join(", ")}
          </p>
        </MetaItem>
        <MetaItem label="ID">
          <CopyIdChip id={email.id} />
        </MetaItem>
      </div>

      {/* ── Email events ── */}
      <div className="hidden space-y-2.5">
        <p className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase">
          Email events
        </p>
        <div className="rounded-lg border bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] [background-size:14px_14px] px-8 py-9">
          <div className="flex flex-col items-start gap-2">
            <div className="bg-card grid size-10 place-items-center rounded-full border shadow-sm">
              <Send className="size-4" />
            </div>
            <span className="bg-status-neutral-bg text-status-neutral rounded-full px-3 py-1 text-xs font-semibold">
              Sent
            </span>
            <p className="text-muted-foreground text-xs">
              {format(new Date(email.createdAt), "MMM dd, h:mm a")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="border-rule flex items-center justify-between border-b px-4 py-3">
          <span className="bg-accent text-accent-foreground rounded-full px-3.5 py-1.5 text-sm font-semibold">
            Preview
          </span>
        </div>
        {view.data?.url ? (
          <iframe
            src={view.data.url}
            title={email.subject}
            sandbox="allow-same-origin"
            className="h-[70vh] w-full bg-white"
          />
        ) : view.isError ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground text-sm">
              Preview unavailable.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full px-5"
              onClick={() => loadPreview({ id: email.id })}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <Skeleton className="h-[70vh] w-full" />
          </div>
        )}
      </div>
    </div>
  );
}

const BackLink = () => (
  <Link
    href="/emails"
    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
  >
    <ArrowLeft className="size-4" />
    Emails
  </Link>
);
