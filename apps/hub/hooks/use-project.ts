"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import type { CollaboratorRole } from "@workspace/drizzle/schema";

import { useProjectId } from "@/hooks/use-repo";

export type Project = {
  projectId: string;
  /** Lowercased, as used for cache keys and visit tracking. */
  owner: string;
  repo: string;
  /** Default branch; "" when only the agency row is known. */
  branch: string;
  websiteUrl: string | null;
  /** Display name from project Settings, if set. */
  name: string | null;
  source: "github" | "upload";
  /** The caller's role on the project (nav gating); null when unknown. */
  role: CollaboratorRole | null;
  /** Owner or admin: may open project Settings. */
  ownerOrAdmin: boolean;
};

/**
 * The project the workspace is focused on (WorkspaceProvider). Reads, in order:
 * the editor's seeded snapshot, the agency row, then the listMine row the
 * project layout seeds for every page. All cache reads: nothing here calls
 * GitHub, so shell pages render for projects without the App installed.
 */
export const useProject = (): Project | null => {
  const trpc = useTRPC();
  const projectId = useProjectId();

  const agency = useQuery(
    trpc.agency.project.queryOptions({ projectId: projectId }, { enabled: false })
  );
  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions({ projectId: projectId }, { enabled: false })
  );
  const projects = useQuery(
    trpc.cms.repos.listMine.queryOptions(undefined, { enabled: !!projectId })
  );

  if (!projectId) return null;

  const row = projects.data?.find((p) => p.projectId === projectId);
  const repo = snapshot.data;
  if (repo) {
    return {
      projectId: projectId,
      owner: repo.owner.toLowerCase(),
      repo: repo.repo.toLowerCase(),
      branch: repo.defaultBranch ?? "",
      websiteUrl: repo.websiteUrl ?? null,
      name: repo.name ?? row?.name ?? null,
      source: repo.source,
      role: repo.myRole ?? row?.role ?? null,
      ownerOrAdmin: row?.ownerOrAdmin || repo.isOwner || false,
    };
  }

  if (row) {
    return {
      projectId: projectId,
      owner: row.owner.toLowerCase(),
      repo: row.repo.toLowerCase(),
      branch: row.defaultBranch,
      websiteUrl: row.websiteUrl,
      name: row.name,
      source: row.source === "upload" ? "upload" : "github",
      role: row.role,
      ownerOrAdmin: row.ownerOrAdmin,
    };
  }

  const client = agency.data;
  if (!client) return null;
  return {
    projectId: client.projectId,
    owner: client.owner.toLowerCase(),
    repo: client.repo.toLowerCase(),
    branch: "",
    websiteUrl: client.websiteUrl ?? null,
    name: null,
    source: "github",
    role: client.role ?? null,
    ownerOrAdmin: false,
  };
};
