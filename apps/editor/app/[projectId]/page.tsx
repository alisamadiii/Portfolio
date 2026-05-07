"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import { Spinner } from "@workspace/ui/components/spinner";

import { EditorWorkspace } from "@/components/editor-workspace";

const EditorProjectPage = ({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) => {
  const { projectId } = use(params);
  const trpc = useTRPC();
  const { data: project, isPending } = useQuery(
    trpc.agentProjects.getProject.queryOptions({ projectId })
  );

  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return <EditorWorkspace project={project} />;
};

export default EditorProjectPage;
