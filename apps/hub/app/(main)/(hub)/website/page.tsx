"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ExternalLink, Globe } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { Github } from "@workspace/ui/icons/social";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";
import { StatusDot } from "@/components/status-dot";

// ─── Types ──────────────────────────────────────────────────────

type Website = RouterOutputs["websites"]["getMine"][number];

// ─── Shared bits ────────────────────────────────────────────────

const PageHeading = () => (
  <>
    <DocumentTitle title="Website" />
    <h2 className="text-[27px] font-extrabold tracking-tight">Website</h2>
  </>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border-rule border-r px-5.5 py-4.5 last:border-r-0">
    <p className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.04em] uppercase">
      {label}
    </p>
    <p className="mt-1 text-[15px] font-bold">{value}</p>
  </div>
);

// ─── Website Card ───────────────────────────────────────────────

const WebsiteCard = ({ site }: { site: Website }) => {
  const { status } = site;

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="border-rule flex items-center gap-4 border-b px-5.5 py-5.5">
        <div className="bg-accent text-accent-foreground grid size-12.5 shrink-0 place-items-center rounded-[14px]">
          <Globe className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-extrabold tracking-tight">
            {site.label || site.domain}
          </p>
          <a
            href={`https://${site.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-[13.5px] transition-colors"
          >
            https://{site.domain}
          </a>
        </div>
        <div className="flex items-center gap-2.5">
          <StatusDot up={status.up} />
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              status.up
                ? "bg-status-success-bg text-status-success"
                : "bg-status-danger-bg text-status-danger"
            )}
          >
            {status.up ? "Live" : "Down"}
          </span>
        </div>
      </div>

      <div className="border-rule grid grid-cols-1 border-b sm:grid-cols-3">
        <Stat
          label="Status"
          value={
            status.up
              ? status.https
                ? "Online · HTTPS"
                : "Online"
              : "Offline"
          }
        />
        <Stat
          label="Last checked"
          value={format(new Date(status.checkedAt), "MMM d, h:mm a")}
        />
        <Stat
          label="Response time"
          value={
            status.responseTimeMs != null ? `${status.responseTimeMs} ms` : "—"
          }
        />
      </div>

      <div className="card-band">
        {site.githubUrl && (
          <Button
            variant="outline"
            className="rounded-full px-5"
            render={
              <a
                href={site.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Github className="size-4" />
            View repository
          </Button>
        )}
        <Button
          className="rounded-full px-5"
          render={
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <ExternalLink className="size-4" />
          Visit site
        </Button>
      </div>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────

export default function WebsitePage() {
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();

  const {
    data: sites,
    isFetching,
    error,
  } = useQuery(
    trpc.websites.getMine.queryOptions(undefined, {
      enabled: !!currentUser,
    })
  );

  if (isFetching) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="bg-card overflow-hidden rounded-lg border">
          <div className="border-rule flex items-center gap-4 border-b px-5.5 py-5.5">
            <Skeleton className="size-12.5 shrink-0 rounded-[14px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="border-rule grid grid-cols-1 border-b sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="border-rule space-y-2 border-r px-5.5 py-4.5 last:border-r-0"
              >
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4.5 w-28" />
              </div>
            ))}
          </div>
          <div className="card-band">
            <Skeleton className="h-9 w-40 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <div className="mx-auto max-w-sm space-y-2.5">
            <h3 className="text-[22px] font-extrabold tracking-tight">
              Something went wrong
            </h3>
            <p className="text-muted-foreground text-[14.5px]">
              {error.message}
            </p>
            {"data" in error && error.data && (
              <p className="text-destructive font-mono text-xs">
                {(error.data as { code?: string }).code ?? "UNKNOWN_ERROR"}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if ((sites?.length ?? 0) === 0) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <h3 className="text-[22px] font-extrabold tracking-tight">
            No website yet
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 mb-5.5 max-w-[380px] text-[14.5px]">
            Your website details will appear here once your site is set up.
            Contact us if you think something is missing.
          </p>
          <RequestDialog>
            <Button size="lg" className="rounded-full px-6">
              Contact Support
            </Button>
          </RequestDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading />
      {sites?.map((site) => <WebsiteCard key={site.id} site={site} />)}
    </div>
  );
}
