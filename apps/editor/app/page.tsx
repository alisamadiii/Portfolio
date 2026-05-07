"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { ProjectSelector } from "@/components/project-selector";

const EditorPage = () => {
  const trpc = useTRPC();
  const { data: projects, isPending } = useQuery(
    trpc.agentProjects.listProjects.queryOptions()
  );

  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-64" />
            <Skeleton className="h-32 w-64" />
          </div>
        </div>
      </div>
    );
  }

  return <ProjectSelector projects={projects ?? []} />;
};

export default EditorPage;
