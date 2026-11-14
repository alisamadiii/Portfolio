"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { WixLogo } from "@/components/ds/brand-logos";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { EmptyState } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { WixBlog } from "./wix-blog";
import { WixLeads } from "./wix-leads";
import { WixBookings, WixContacts, WixOrders } from "./wix-records";

type Overview = RouterOutputs["wix"]["overview"];

const RETURN_TOASTS: Record<string, () => void> = {
  connected: () => toast.success("Wix connected."),
  taken: () => toast.error("That Wix site is already connected to another project."),
  error: () => toast.error("Couldn't connect Wix. Try again."),
};

/** Project Wix app: install on a Wix site, then manage its blog, leads and records. */
export function WixPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [returned, setReturned] = useQueryState("wix", parseAsString);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const status = useQuery(trpc.wix.status.queryOptions({ projectId }));
  const connected = !!status.data?.connected;
  const overview = useQuery(
    trpc.wix.overview.queryOptions({ projectId }, { enabled: connected, retry: false })
  );

  // Back from Wix's installer (the api callback already bound the site).
  useEffect(() => {
    if (!returned) return;
    RETURN_TOASTS[returned]?.();
    void setReturned(null);
    void queryClient.invalidateQueries({ queryKey: trpc.wix.pathKey() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned]);

  const install = useMutation(
    trpc.wix.installUrl.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(handleCmsError(error, "Couldn't start the Wix install.")),
    })
  );
  const disconnect = useMutation(
    trpc.wix.disconnect.mutationOptions({
      onSuccess: ({ manageAppsUrl }) => {
        toast.success("Wix disconnected. Remove the app from your site in Wix to finish.");
        if (manageAppsUrl) window.open(manageAppsUrl, "_blank", "noreferrer");
        void queryClient.invalidateQueries({ queryKey: trpc.wix.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect Wix.")),
    })
  );
  const startConnect = () => install.mutate({ projectId });

  const header = (
    <PageHeader
      title="Wix"
      description="Your Wix site in one place: blog posts, form leads, contacts, orders and bookings."
      actions={
        connected && fullAccess ? (
          <Button
            variant="ghost"
            onClick={() => setConfirmDisconnect(true)}
            disabled={disconnect.isPending}
          >
            {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : undefined
      }
    />
  );

  if (status.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[280px] rounded-card" />
      </div>
    );
  }

  if (!connected) {
    const configured = !!status.data?.configured;
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<WixLogo className="size-5" />}
            title="Connect your Wix site"
            text={
              !fullAccess
                ? "The site owner hasn't connected Wix yet."
                : configured
                  ? "Wix asks which of your sites to connect and what the hub may access. You won't need to share your password."
                  : "The Wix app isn't set up yet. Contact support and we'll switch it on."
            }
            action={
              fullAccess &&
              configured && (
                <Button variant="primary" onClick={startConnect} disabled={install.isPending}>
                  {install.isPending ? "Opening Wix…" : "Connect Wix"}
                </Button>
              )
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Disconnect Wix?"
        description="The hub stops reading this Wix site. Nothing on the site changes. To fully remove access, also remove the app from your site in Wix (we open that page for you)."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
      {overview.isError ? (
        <Card>
          <EmptyState
            icon={<Globe className="size-5" />}
            title="Couldn't load your Wix site"
            text={handleCmsError(overview.error, "Wix didn't answer. Try again in a moment.")}
            action={
              fullAccess && (
                <Button variant="primary" onClick={startConnect} disabled={install.isPending}>
                  Reconnect Wix
                </Button>
              )
            }
          />
        </Card>
      ) : overview.isPending ? (
        <Skeleton className="h-[320px] rounded-card" />
      ) : (
        <ConnectedSite overview={overview.data} />
      )}
    </div>
  );
}

function ConnectedSite({ overview }: { overview: Overview }) {
  const has = (key: string) => overview.apps.some((a) => a.key === key);
  const tabs = [
    { id: "overview", label: "Overview" },
    ...(has("blog") ? [{ id: "blog", label: "Blog" }] : []),
    ...(has("forms") ? [{ id: "leads", label: "Form leads" }] : []),
    { id: "contacts", label: "Contacts" },
    ...(has("stores") ? [{ id: "orders", label: "Orders" }] : []),
    ...(has("bookings") ? [{ id: "bookings", label: "Bookings" }] : []),
  ];
  const [tab, setTab] = useState("overview");
  const current = tabs.some((t) => t.id === tab) ? tab : "overview";

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-[16px] font-semibold text-ink">
              {overview.siteName ?? "Your Wix site"}
            </span>
            {overview.siteUrl ? (
              <a
                href={overview.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-[13px] text-coral-text hover:underline"
              >
                {overview.siteUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="text-[13px] text-dim">Not published yet</span>
            )}
          </div>
          {overview.dashboardUrl && (
            <ButtonAnchor
              href={overview.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              icon={<ExternalLink className="size-4" />}
            >
              Open Wix dashboard
            </ButtonAnchor>
          )}
        </div>
      </Card>
      <UnderlineTabs label="Wix sections" items={tabs} value={current} onChange={setTab} />
      {current === "overview" && <OverviewTab overview={overview} />}
      {current === "blog" && <WixBlog />}
      {current === "leads" && <WixLeads />}
      {current === "contacts" && <WixContacts />}
      {current === "orders" && <WixOrders />}
      {current === "bookings" && <WixBookings />}
    </>
  );
}

function OverviewTab({ overview }: { overview: Overview }) {
  const rows: [string, string | null][] = [
    ["Business name", overview.businessName],
    ["Email", overview.email],
    ["Phone", overview.phone],
    ["Address", overview.address],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Business info on Wix" divided />
        <dl className="flex flex-col divide-y divide-divider text-[14px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-6 py-3">
              <dt className="text-dim">{label}</dt>
              <dd className="text-right text-ink">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Wix apps on this site" divided />
        <div className="flex flex-wrap gap-2 px-6 py-5">
          {overview.apps.length ? (
            overview.apps.map((a) => (
              <Badge key={a.key} tone="neutral">
                {a.name}
              </Badge>
            ))
          ) : (
            <p className="text-[13px] text-dim">No Wix business apps found on this site.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
