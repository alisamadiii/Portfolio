"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRepo } from "@/contexts/repo-context";
import { ArrowUpRight, BookOpen, ChevronsUpDown } from "@/components/icon";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { repoPath } from "@/lib/paths";
import { getVisits } from "@/lib/tracker";

/** Compact repo dropdown for the floating canvas chrome (ex sidebar RepoSwitcher). */
export function RepoMenu() {
  const { owner, repo } = useRepo();
  const [recentRepos, setRecentRepos] = useState<
    Array<{ owner: string; repo: string; branch: string }>
  >([]);

  const loadRecentRepos = useCallback(() => {
    const visits = getVisits()
      .filter(
        (visit) =>
          !(
            visit.owner.toLowerCase() === owner.toLowerCase() &&
            visit.repo.toLowerCase() === repo.toLowerCase()
          )
      )
      .slice(0, 3)
      .map((visit) => ({
        owner: visit.owner,
        repo: visit.repo,
        branch: visit.branch,
      }));
    setRecentRepos(visits);
  }, [owner, repo]);

  useEffect(() => {
    loadRecentRepos();
  }, [loadRecentRepos]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) loadRecentRepos();
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <Avatar className="size-6 rounded-md">
              <AvatarImage src={`https://github.com/${owner}.png`} alt={owner} />
              <AvatarFallback>{owner.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="max-w-36 truncate text-sm font-medium">
              {repo}
            </span>
            <ChevronsUpDown className="text-muted-foreground size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent className="w-64 rounded-lg" align="start">
        <DropdownMenuItem
          render={
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
              <ArrowUpRight className="text-muted-foreground ml-auto size-3" />
            </a>
          }
        />
        <DropdownMenuItem
          render={
            <Link href="/guide">
              Guide
              <BookOpen className="text-muted-foreground ml-auto size-3.5" />
            </Link>
          }
        />
        {recentRepos.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Recently visited
              </DropdownMenuLabel>
              {recentRepos.map((visit) => (
                <DropdownMenuItem
                  key={`${visit.owner}/${visit.repo}/${visit.branch}`}
                  render={
                    <Link href={repoPath(visit.repo)}>
                      <img
                        src={`https://github.com/${visit.owner}.png`}
                        alt={`${visit.owner}'s avatar`}
                        loading="lazy"
                        className="size-5 rounded"
                      />
                      <span className="truncate">{visit.repo}</span>
                    </Link>
                  }
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/">All projects</Link>} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
