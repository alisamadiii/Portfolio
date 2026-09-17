"use client";

import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { INTEGRATION_APPS } from "@/lib/integrations";

const PageHeading = () => (
  <>
    <DocumentTitle title="Integrations" />
    <div>
      <h2 className="text-[27px] font-extrabold tracking-tight">
        Integrations
      </h2>
      <p className="text-muted-foreground mt-1 text-[14.5px]">
        Connect the apps your website works with.
      </p>
    </div>
  </>
);

export default function IntegrationsPage() {
  const user = useCurrentUser();
  const trpc = useTRPC();
  const { data: statuses, isPending } = useQuery(
    trpc.integrations.status.queryOptions(undefined, { enabled: !!user.data })
  );

  if (user.isPending || isPending) {
    return (
      <div className="space-y-10">
        <PageHeading />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATION_APPS.map((app) => (
            <Skeleton key={app.id} className="h-52 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeading />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_APPS.map((app) => (
          <IntegrationCard
            key={app.id}
            app={app}
            status={statuses?.find((status) => status.id === app.id)}
          />
        ))}
      </div>
    </div>
  );
}
