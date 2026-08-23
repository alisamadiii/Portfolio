"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronsUpDown, LockKeyhole, RefreshCw, Search } from "@/components/icon";
import { useDebounce } from "use-debounce";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { isAdminUser } from "@/lib/authz-shared";
import { repoPath } from "@/lib/paths";

export function RepoSelect({
  onAccountSelect,
}: {
  onAccountSelect?: (account: any) => void;
}) {
  const { user } = useUser();

  const accounts = useMemo(() => {
    if (!user) return [];
    return user.accounts || [];
  }, [user]);

  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounce(
    selectedAccount?.repositorySelection === "all" ? keyword : "",
    500
  );
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const reposQuery = useQuery(
    trpc.cms.repos.listMine.queryOptions(
      {
        owner: selectedAccount?.login ?? "",
        keyword: debouncedKeyword,
      },
      { enabled: !!selectedAccount }
    )
  );
  const results = reposQuery.isError ? [] : (reposQuery.data ?? null);

  const searchResults = useMemo(() => {
    if (!results) return [];
    if (selectedAccount?.repositorySelection !== "all") {
      return results.filter((result: any) =>
        result.repo.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    return results;
  }, [results, keyword, selectedAccount]);

  const syncMutation = useMutation(
    trpc.cms.repos.syncRepos.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.cms.repos.listMine.queryKey(),
        }),
      onError: (error) => console.error(error),
    })
  );
  const isSyncing = syncMutation.isPending;

  const resultsLoadingSkeleton = useMemo(
    () => (
      <ul>
        {[...Array(5)].map((_, index) => (
          <li
            key={index}
            className="flex items-center gap-x-2 border border-b-0 px-3 py-2 text-sm first:rounded-t-md last:rounded-b-md last:border-b"
          >
            <Skeleton className="h-5 w-24 rounded text-left" />
            <Skeleton className="h-5 w-24 rounded text-left" />
            <Button variant="outline" size="xs" className="ml-auto" disabled>
              Open
            </Button>
          </li>
        ))}
      </ul>
    ),
    []
  );

  return (
    <div className="flex flex-col gap-y-4">
      <div className="max-w flex w-full items-center gap-x-2">
        {accounts.length > 1 ? (
          <ButtonGroup>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline">
                    <img
                      className="size-6 rounded"
                      src={`https://github.com/${selectedAccount?.login}.png`}
                      alt={`${selectedAccount?.login}'s avatar`}
                      loading="lazy"
                    />
                    <span className="mr-2">{selectedAccount?.login}</span>
                    <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start">
                {accounts.map((account: any) => (
                  <DropdownMenuItem
                    key={account.login}
                    onSelect={() => {
                      setSelectedAccount(account);
                      if (onAccountSelect) onAccountSelect(account);
                    }}
                  >
                    <img
                      className="size-6 rounded"
                      src={`https://github.com/${account.login}.png`}
                      alt={`${account.login}'s avatar`}
                      loading="lazy"
                    />
                    <span className="truncate">{account.login}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        ) : selectedAccount ? (
          <div className="flex items-center gap-x-2 rounded-md border px-3 py-2 text-sm font-medium">
            <img
              className="size-6 rounded"
              src={`https://github.com/${selectedAccount.login}.png`}
              alt={`${selectedAccount.login}'s avatar`}
              loading="lazy"
            />
            <span>{selectedAccount.login}</span>
          </div>
        ) : null}
        <div className="relative flex-1">
          <Input
            placeholder="Search repositories by name"
            className="pl-9"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-50" />
        </div>
        {isAdminUser(user) && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => syncMutation.mutate()}
            disabled={isSyncing}
            title="Refresh repositories from GitHub"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>
        )}
      </div>
      {reposQuery.isFetching || results === null ? (
        resultsLoadingSkeleton
      ) : searchResults.length > 0 ? (
        <ul>
          {searchResults.map((result: any) => (
            <li
              key={`${result.owner}/${result.repo}`}
              className="flex items-center gap-x-2 border border-b-0 px-3 py-2 text-sm first:rounded-t-md last:rounded-b-md last:border-b"
            >
              <Link
                className="truncate font-medium hover:underline"
                href={repoPath(result.repo)}
              >
                {result.repo}
              </Link>
              {result.private && <LockKeyhole className="h-3 w-3 opacity-50" />}
              {result.updatedAt && (
                <div className="text-muted-foreground truncate">
                  {formatDistanceToNow(new Date(result.updatedAt))} ago
                </div>
              )}
              <Link
                className={cn(
                  "ml-auto",
                  buttonVariants({ variant: "outline", size: "xs" })
                )}
                href={repoPath(result.repo)}
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="bg-accent h-[206px] flex-none p-4 md:p-6">
          <EmptyHeader>
            <EmptyTitle>No projects</EmptyTitle>
            <EmptyDescription>
              No projects matched your search.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
