"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/user-context";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { useTRPC } from "@workspace/trpc/client";

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
  children: (props: {
    onClick: () => void;
    loading: boolean;
  }) => React.ReactElement;
}) {
  const { user } = useUser();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const decide = (repos: any) => {
    if (repos?.length === 1) {
      const p = repos[0];
      router.push(
        `/${p.owner}/${p.repo}/${p.defaultBranch ? encodeURIComponent(p.defaultBranch) : ""}`
      );
    } else {
      setOpen(true);
    }
  };

  const handleClick = async () => {
    const accounts = user?.accounts ?? [];
    // Only a single-account user can auto-resolve to one project; anything else
    // (multiple accounts, or none) falls through to the picker dialog.
    if (accounts.length !== 1) {
      setOpen(true);
      return;
    }

    const opts = trpc.cms.repos.listMine.queryOptions(
      { owner: accounts[0].login, keyword: "" },
      { staleTime: 5 * 60 * 1000 }
    );

    // Cache hit → decide synchronously, no spinner, no network.
    const cached = queryClient.getQueryData(opts.queryKey);
    if (cached) {
      decide(cached);
      return;
    }

    // First click → spinner + fetch; result is cached for next time and reused
    // by RepoSelect (same query key) when the dialog opens.
    setLoading(true);
    try {
      decide(await queryClient.fetchQuery(opts));
    } catch {
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children({ onClick: handleClick, loading })}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
        </DialogHeader>
        <CmsProjects />
      </DialogContent>
    </Dialog>
  );
}
