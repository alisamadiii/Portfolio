"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { useProjectId } from "@/hooks/use-repo";

export type AgencyClient = NonNullable<RouterOutputs["agency"]["project"]>;

/**
 * The agency data of the focused project, or null when the site has none (no
 * agency_client row / plan). The (main) layout seeds the query (AgencySeed)
 * when it exists, so there is no loading flash.
 */
export const useAgencyOptional = (): AgencyClient | null => {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const { data } = useQuery(
    trpc.agency.project.queryOptions({ projectId }, { enabled: !!projectId })
  );
  return data ?? null;
};

/**
 * Same, but throws when missing. Only render consumers inside
 * <AgencyBoundary>, which shows a paywall / empty state instead.
 */
export const useAgency = (): AgencyClient => {
  const data = useAgencyOptional();
  if (!data) {
    throw new Error("useAgency is only available inside <AgencyBoundary>.");
  }
  return data;
};
