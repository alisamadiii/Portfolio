"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

export type RepoSnapshot = RouterOutputs["cms"]["repos"]["getSnapshot"];

/** The /p/[repoId] route's project id, or 0 outside a project route. */
export const useRouteRepoId = (): number => {
  const params = useParams<{ repoId?: string }>();
  return Number(params?.repoId) || 0;
};

/**
 * The current project's snapshot (cms.repos.getSnapshot) inside /p/[repoId].
 * The route layout seeds it (ProjectSeed), so it's there on the first render;
 * invalidating the query (e.g. after a domain change) updates every reader.
 */
export const useRepo = (): RepoSnapshot => {
  const trpc = useTRPC();
  const repoId = useRouteRepoId();
  const { data } = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions({ repoId }, { enabled: repoId > 0 })
  );
  if (!data) {
    throw new Error("useRepo is only available inside a /p/[repoId] route.");
  }
  return data;
};
