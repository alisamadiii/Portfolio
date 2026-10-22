"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import { useRouteRepoId } from "@/hooks/use-repo";

export type Project = {
  repoId: number;
  /** Lowercased, as used for cache keys and visit tracking. */
  owner: string;
  repo: string;
  /** Default branch; "" in the agency UI, which has no branch context. */
  branch: string;
};

/**
 * The project the current screen is about: the /p/[repoId] route's project,
 * or, in the agency UI (no route param), the agency client's one website.
 * Both come from React Query caches the layouts seed on the server.
 */
export const useProject = (): Project | null => {
  const trpc = useTRPC();
  const routeRepoId = useRouteRepoId();

  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions(
      { repoId: routeRepoId },
      { enabled: routeRepoId > 0 }
    )
  );
  const agency = useQuery(
    trpc.agency.me.queryOptions(undefined, { enabled: routeRepoId === 0 })
  );

  if (routeRepoId > 0) {
    const repo = snapshot.data;
    if (!repo) return null;
    return {
      repoId: routeRepoId,
      owner: repo.owner.toLowerCase(),
      repo: repo.repo.toLowerCase(),
      branch: repo.defaultBranch ?? "",
    };
  }

  const client = agency.data;
  if (!client) return null;
  return {
    repoId: client.repoId,
    owner: client.owner.toLowerCase(),
    repo: client.repo.toLowerCase(),
    branch: "",
  };
};
