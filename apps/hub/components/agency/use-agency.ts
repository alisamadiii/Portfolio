"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { agencyHref } from "@/lib/paths";
import { useRouteProjectId } from "@/hooks/use-repo";

export { agencyHref };

export type AgencyClient = NonNullable<RouterOutputs["agency"]["project"]>;

/**
 * The agency data of the current /p/[projectId] project, or null when the
 * site has none (no agency_client row / plan). The project layout seeds the
 * query (AgencySeed) when it exists, so there is no loading flash.
 */
export const useAgencyOptional = (): AgencyClient | null => {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
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

/**
 * Builds hub URLs for agency pages, which all live under the project:
 * href("/agency/booking") → "/p/<projectId>/agency/booking", href("/") → "/p/<projectId>".
 */
export const useAgencyHref = () => {
  const projectId = useRouteProjectId();
  return (path: string) => agencyHref(projectId, path);
};
