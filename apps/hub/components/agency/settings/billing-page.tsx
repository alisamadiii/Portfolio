"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useEntitlement } from "@/hooks/use-plans";

import { DeleteSiteCard } from "@/components/agency/settings/danger-page";
import {
  ProjectManage,
  ProjectPlans,
} from "@/components/billing/project-billing";
import { PageHeader } from "@/components/ds/layout/page-header";
import { PanelError } from "@/components/settings/panel-error";
import { useRouteProjectId } from "@/hooks/use-repo";

/**
 * Billing: this site's plan and invoices (reusing the picker / manage
 * blocks), with the delete-site zone at the bottom since deleting settles the
 * subscription first.
 */
export function AgencyBillingPage() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const user = useCurrentUser().data?.user ?? null;
  const { refresh: refreshPlans } = useEntitlement(projectId);

  const { data, isLoading, error, refetch, isRefetching } = useQuery(
    trpc.cms.subscription.getProject.queryOptions({ projectId })
  );

  // Back from Stripe checkout: the webhook writes the row asynchronously, so
  // clear the flag and refetch (twice, to outrun webhook lag).
  const handledReturn = useRef(false);
  useEffect(() => {
    if (handledReturn.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("purchase") !== "success") return;
    handledReturn.current = true;
    url.searchParams.delete("purchase");
    window.history.replaceState(null, "", url.toString());
    void refetch();
    void refreshPlans();
    const t = setTimeout(() => {
      void refetch();
      void refreshPlans();
    }, 2500);
    return () => clearTimeout(t);
  }, [refetch, refreshPlans]);

  return (
    <>
      <PageHeader title="Billing" description="Your plan and invoices for this site." />
      <div className="max-w-screen-md">
        {error ? (
          <PanelError
            title="Failed to load billing"
            message={error.message}
            onRetry={() => void refetch()}
            retrying={isRefetching}
          />
        ) : isLoading || !data ? (
          <div className="flex justify-center py-24">
            <Spinner className="text-muted-foreground size-6" />
          </div>
        ) : !data.subscription || data.subscription.status === "canceled" ? (
          user ? (
            <ProjectPlans
              projectId={data.projectId}
              userId={user.id}
              userEmail={user.email}
              userName={user.name}
            />
          ) : null
        ) : (
          <ProjectManage
            projectId={data.projectId}
            subscription={data.subscription}
          />
        )}
      </div>
      <DeleteSiteCard />
    </>
  );
}
