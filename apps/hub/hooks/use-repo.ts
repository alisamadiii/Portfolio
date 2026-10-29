"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import { isProjectId } from "@/lib/paths";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

export type RepoSnapshot = RouterOutputs["cms"]["repos"]["getSnapshot"];

/** The /p/[projectId] route's project id (uuid), or "" outside a project route. */
export const useRouteProjectId = (): string => {
  const params = useParams<{ projectId?: string }>();
  return isProjectId(params?.projectId) ? params.projectId : "";
};

/**
 * The current project's snapshot (cms.repos.getSnapshot) inside /p/[projectId].
 * The route layout seeds it (ProjectSeed), so it's there on the first render;
 * invalidating the query (e.g. after a domain change) updates every reader.
 */
export const useRepo = (): RepoSnapshot => {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const { data } = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions({ projectId }, { enabled: !!projectId })
  );
  if (!data) {
    throw new Error("useRepo is only available inside a /p/[projectId] route.");
  }
  return data;
};
