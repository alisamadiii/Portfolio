"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import { useRouteRepoId } from "@/hooks/use-repo";

export type Project = {
  repoId: number;
  /** Lowercased, as used for cache keys and visit tracking. */
  owner: string;
  repo: string;
  /** Default branch; "" on agency pages, which have no branch context. */
  branch: string;
};

/**
 * The project the current /p/[repoId] screen is about. Agency pages read the
 * seeded agency.project cache (no repo snapshot there); the website editor
 * reads the seeded snapshot. Both are seeded on the server by the layouts.
 */
export const useProject = (): Project | null => {
  const trpc = useTRPC();
  const routeRepoId = useRouteRepoId();

  // Cache read only: AgencySeed fills it inside the @agency slot.
  const agency = useQuery(
    trpc.agency.project.queryOptions({ repoId: routeRepoId }, { enabled: false })
  );
  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions(
      { repoId: routeRepoId },
      { enabled: routeRepoId > 0 && !agency.data }
    )
  );

  if (routeRepoId <= 0) return null;

  const repo = snapshot.data;
  if (repo) {
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
