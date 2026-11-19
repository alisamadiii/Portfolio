"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";

export { useProjectId } from "@/components/workspace-provider";
import { useProjectId } from "@/components/workspace-provider";

export type RepoSnapshot = RouterOutputs["cms"]["repos"]["getSnapshot"];

/**
 * The focused project's snapshot (cms.repos.getSnapshot) inside the editor.
 * The editor layout seeds it (ProjectSeed), so it's there on the first render;
 * invalidating the query (e.g. after a domain change) updates every reader.
 */
export const useRepo = (): RepoSnapshot => {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const { data } = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions({ projectId }, { enabled: !!projectId })
  );
  if (!data) {
    throw new Error("useRepo is only available inside the editor.");
  }
  return data;
};
