"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

export function RepoBranches() {
  const { owner, repo, branches, setBranches } = useRepo();
  const { config } = useConfig();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filteredBranches, setFilteredBranches] = useState<
    string[] | undefined
  >([]);

  useEffect(() => {
    setFilteredBranches(
      branches?.filter((branch) =>
        branch.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, branches]);

  const isValidBranchName = useCallback((name: string) => {
    if (!name || name.length > 255) return false;
    const validBranchRegex =
      /^(?!\/|.*(?:\/\.|\/\/|\.\.|@{|\\))[^\x20\x7f ~^:?*\[\]]+(?<!\.|\/)$/;
    return validBranchRegex.test(name);
  }, []);

  const createBranchMutation = useMutation(
    trpc.cms.branches.create.mutationOptions({
      onSuccess: (_data, variables) => {
        const newBranch = variables.name;
        if (branches) {
          setBranches([...branches, newBranch]);
        } else {
          setBranches([newBranch]);
        }
        void queryClient.invalidateQueries({
          queryKey: trpc.cms.repos.getSnapshot.queryKey({ owner, repo }),
        });
      },
      onError: (error) => {
        console.error("Error creating branch:", error);
        // TODO: display an error?
      },
    })
  );
  const isSubmitting = createBranchMutation.isPending;

  const handleCreateBranch = () => {
    if (config) {
      // TODO: do we ask the user to confirm?
      if (search || isValidBranchName(search)) {
        createBranchMutation.mutate({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch,
          name: search,
        });
      }
    }
  };

  if (!branches || branches.length === 0) {
    return <div className="text-muted-foreground p-4">No branches.</div>;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <header className="flex gap-x-2">
        <Input
          placeholder="Search branches by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          disabled={
            !search ||
            !isValidBranchName(search) ||
            branches.includes(search) ||
            isSubmitting
          }
          onClick={handleCreateBranch}
        >
          Create
          {isSubmitting && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </header>
      <main className="scrollbar flex max-h-[calc(100vh-9rem)] flex-col gap-y-1 overflow-auto text-sm">
        {filteredBranches && filteredBranches.length > 0 ? (
          filteredBranches.map((branch) => (
            <Link
              key={branch}
              className={cn(
                branch === config?.branch
                  ? "bg-accent cursor-default"
                  : "hover:bg-accent",
                "ring-offset-background focus-visible:ring-ring inline-flex items-center rounded-lg px-3 py-2 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
              href={`/${owner}/${repo}/${encodeURIComponent(branch)}`}
            >
              <span className="truncate">{branch}</span>
              {branch === config?.branch && (
                <Check className="ml-auto h-4 w-4 opacity-50" />
              )}
            </Link>
          ))
        ) : (
          <div className="text-muted-foreground py-6 text-center">
            No branches found.
          </div>
        )}
      </main>
    </div>
  );
}
