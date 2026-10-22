"use client";

import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";

import { DocumentTitle } from "@/components/document-title";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { INTEGRATION_APPS } from "@/lib/integrations";

// Agency clients don't connect GitHub (their one website is hosted for them),
// so this page only lists the app integrations.
export default function AgencyIntegrationsPage() {
  const trpc = useTRPC();
  const { data: statuses, isPending } = useQuery(
    trpc.integrations.status.queryOptions()
  );

  return (
    <div className="space-y-10">
      <DocumentTitle title="Integrations" />
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">
          Integrations
        </h2>
        <p className="text-muted-foreground mt-1.5 text-[15px]">
          Connect the apps your business works with.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_APPS.map((app) =>
          isPending ? (
            <Skeleton key={app.id} className="h-52 w-full rounded-lg" />
          ) : (
            <IntegrationCard
              key={app.id}
              app={app}
              status={statuses?.find((status) => status.id === app.id)}
            />
          )
        )}
      </div>
    </div>
  );
}
