"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { agencyHref } from "@/lib/paths";
import { useRouteRepoId } from "@/hooks/use-repo";

export { agencyHref };

export type AgencyClient = NonNullable<RouterOutputs["agency"]["project"]>;

/**
 * The agency workspace of the current /p/[repoId] project. Only used inside
 * the @agency slot, which the project layout renders after seeding this query
 * (AgencySeed), so the data is always there on the first render.
 */
export const useAgency = (): AgencyClient => {
  const trpc = useTRPC();
  const repoId = useRouteRepoId();
  const { data } = useQuery(
    trpc.agency.project.queryOptions({ repoId }, { enabled: repoId > 0 })
  );
  if (!data) {
    throw new Error("useAgency is only available inside the agency UI.");
  }
  return data;
};

/**
 * Builds hub URLs for agency pages, which all live under the project:
 * href("/agency/booking") → "/p/<repoId>/agency/booking", href("/") → "/p/<repoId>".
 */
export const useAgencyHref = () => {
  const repoId = useRouteRepoId();
  return (path: string) => agencyHref(repoId, path);
};
