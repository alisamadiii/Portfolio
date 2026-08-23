"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { EnvelopeMark } from "@/components/emails/envelope-mark";
import { DocumentTitle } from "@/components/document-title";
import { Check, Copy, ExternalLink } from "@/components/icon";

const MetaItem = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <p className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase">
      {label}
    </p>
    <div className="mt-1.5 text-sm font-medium">{children}</div>
  </div>
);

const CopyChip = ({ value, label }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label ?? "Value"} copied`);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="bg-muted hover:bg-muted/70 flex max-w-full items-center gap-2 rounded-md px-2.5 py-1 font-mono text-xs transition-colors"
      title={value}
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="text-status-success size-3.5 shrink-0" />
      ) : (
        <Copy className="text-muted-foreground size-3.5 shrink-0" />
      )}
    </button>
  );
};

export default function EmailByIdPage() {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();

  const {
    data: email,
    isLoading,
    error,
  } = useQuery(
    trpc.emails.getById.queryOptions({ id }, { enabled: !!id })
  );

  // Presigned URL dies in ~60s — a mutation fetched fresh on view / retry.
  const view = useMutation(trpc.emails.getViewUrlById.mutationOptions());
  const { mutate: loadPreview } = view;

  useEffect(() => {
    if (email) loadPreview({ id: email.id });
  }, [email?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openInNewTab = () => {
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

  return (
    <div className="mx-auto w-full max-w-screen-md space-y-6 px-4 py-8 md:py-12">
      <DocumentTitle title={email?.subject ?? "Email"} />

      {error ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center">
          <div className="bg-muted mx-auto grid size-12 place-items-center rounded-full">
            <EnvelopeMark className="text-muted-foreground size-6" />
          </div>
          <h1 className="mt-4 text-[22px] font-extrabold tracking-tight">
            Email not found
          </h1>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[380px] text-[14.5px]">
            This email doesn&apos;t exist, or you don&apos;t have access to it.
          </p>
        </div>
      ) : isLoading || !email ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-7 w-72" />
            </div>
          </div>
          <Skeleton className="h-[65vh] w-full rounded-lg" />
        </div>
      ) : (
        <>
          {/* ── Header ── */}
          <div className="flex items-center gap-4">
            <div className="bg-status-success-bg text-status-success grid size-14 shrink-0 place-items-center rounded-2xl border border-green-500/50">
              <EnvelopeMark className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs font-medium">Email</p>
              <h1 className="truncate text-[24px] font-extrabold tracking-tight">
                {email.subject}
              </h1>
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
            <MetaItem label="To">
              <p className="truncate" title={email.to.join(", ")}>
                {email.to.join(", ")}
              </p>
            </MetaItem>
            <MetaItem label="Sent">
              <p className={cn("whitespace-nowrap")}>
                {format(new Date(email.createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </MetaItem>
            <MetaItem label="ID">
              <CopyChip value={email.id} label="Email ID" />
            </MetaItem>
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
        </>
      )}
    </div>
  );
}
