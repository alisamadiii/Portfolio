"use client";

import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Card } from "@/components/ds/ui/card";
import { GithubAppCard } from "@/components/integrations/github-app-card";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { INTEGRATION_APPS } from "@/lib/integrations";

export default function IntegrationsPage() {
  const user = useCurrentUser();
  const trpc = useTRPC();
  const { data: statuses, isPending } = useQuery(
    trpc.integrations.status.queryOptions(undefined, { enabled: !!user.data })
  );

  return (
    <>
      <DocumentTitle title="Integrations" />
      <PageHeader
        title="Integrations"
        description="Accounts the hub uses across all of your sites."
      />
      {user.isPending || isPending ? (
        <Skeleton className="h-44 w-full rounded-card" />
      ) : (
        <Card>
          <GithubAppCard />
          {INTEGRATION_APPS.map((app) => (
            <IntegrationCard
              key={app.id}
              app={app}
              status={statuses?.find((status) => status.id === app.id)}
            />
          ))}
        </Card>
      )}
    </>
  );
}
