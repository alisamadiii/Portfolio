"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/user-context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { getVisits } from "@/lib/tracker";

import { RepoLatest } from "@/components/repo/repo-latest";
import { RepoSelect } from "@/components/repo/repo-select";

// All project-list logic lives here so it only mounts — and only fetches —
// while the dialog is open (DialogPortal unmounts its content on close).
function CmsProjects() {
  const [hasRecentVisits, setHasRecentVisits] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setHasRecentVisits(getVisits().length > 0);
  }, []);

  if (!user?.accounts?.length) {
    return (
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            You need an invitation to a repository before you can collaborate.
            Ask an admin to invite you.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {hasRecentVisits && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium tracking-tight">
            Recently visited
          </h3>
          <RepoLatest />
        </div>
      )}
      <div className="space-y-3">
        <h3 className="text-sm font-medium tracking-tight">Open a project</h3>
        <RepoSelect />
      </div>
    </div>
  );
}

export function CmsProjectsDialog({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
        </DialogHeader>
        <CmsProjects />
      </DialogContent>
    </Dialog>
  );
}
