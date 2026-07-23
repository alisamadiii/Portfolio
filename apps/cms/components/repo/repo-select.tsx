"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { formatDistanceToNow } from "date-fns";
import { ChevronsUpDown, LockKeyhole, RefreshCw, Search } from "lucide-react";
import { useDebounce } from "use-debounce";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { buttonVariants } from "@workspace/ui/components/button-variants";
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

import { requireApiSuccess } from "@/lib/api-client";
import { isAdminUser } from "@/lib/authz-shared";

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
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const searchResults = useMemo(() => {
    if (!results) return [];
    if (selectedAccount?.repositorySelection !== "all") {
      return results.filter((result: any) =>
        result.repo.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    return results;
  }, [results, keyword, selectedAccount]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!selectedAccount) return;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          type: selectedAccount.type,
          keyword: debouncedKeyword,
          repository_selection: selectedAccount.repositorySelection,
        });

        const response = await fetch(
          `/api/repos/${selectedAccount.login}?${params.toString()}`,
          { signal: abortControllerRef.current.signal }
        );
        const data = await requireApiSuccess<{
          status: string;
          data: any[];
          message?: string;
        }>(response, "Failed to fetch repos");

        setResults(data.data);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error(error);
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [debouncedKeyword, selectedAccount, refreshIndex]);

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/repos/sync", { method: "POST" });
      await requireApiSuccess(response, "Failed to refresh repos");
      setRefreshIndex((index) => index + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

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
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <img
                    className="size-6 rounded"
                    src={`https://github.com/${selectedAccount?.login}.png`}
                    alt={`${selectedAccount?.login}'s avatar`}
                  />
                  <span className="mr-2">{selectedAccount?.login}</span>
                  <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
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
            onClick={handleRefresh}
            disabled={isSyncing}
            title="Refresh repositories from GitHub"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>
        )}
      </div>
      {isLoading || results === null ? (
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
                href={`/${result.owner}/${result.repo}/${result.defaultBranch ? encodeURIComponent(result.defaultBranch) : ""}`}
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
                href={`/${result.owner}/${result.repo}/${result.defaultBranch ? encodeURIComponent(result.defaultBranch) : ""}`}
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
