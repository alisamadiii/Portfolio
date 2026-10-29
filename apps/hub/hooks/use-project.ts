"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import { useRouteProjectId } from "@/hooks/use-repo";

export type Project = {
  projectId: string;
  /** Lowercased, as used for cache keys and visit tracking. */
  owner: string;
  repo: string;
  /** Default branch; "" on agency pages, which have no branch context. */
  branch: string;
};

/**
 * The project the current /p/[projectId] screen is about. Agency pages read the
 * seeded agency.project cache (no repo snapshot there); the website editor
 * reads the seeded snapshot. Both are seeded on the server by the layouts.
 */
export const useProject = (): Project | null => {
  const trpc = useTRPC();
  const routeProjectId = useRouteProjectId();

  // Cache read only: AgencySeed fills it inside the @agency slot.
  const agency = useQuery(
    trpc.agency.project.queryOptions({ projectId: routeProjectId }, { enabled: false })
  );
  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions(
      { projectId: routeProjectId },
      { enabled: !!routeProjectId && !agency.data }
    )
  );

  if (!routeProjectId) return null;

  const repo = snapshot.data;
  if (repo) {
    return {
      projectId: routeProjectId,
      owner: repo.owner.toLowerCase(),
      repo: repo.repo.toLowerCase(),
      branch: repo.defaultBranch ?? "",
    };
  }

  const client = agency.data;
  if (!client) return null;
  return {
    projectId: client.projectId,
    owner: client.owner.toLowerCase(),
    repo: client.repo.toLowerCase(),
    branch: "",
  };
};
