"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { buttonVariants } from "@workspace/ui/components/button-variants";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { getVisits } from "@/lib/tracker";

export function RepoLatest() {
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const displayedVisits = recentVisits.slice(0, 3);

  useEffect(() => {
    // Only run in browser
    if (typeof window !== "undefined") {
      const visits = getVisits();
      setRecentVisits(visits);
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <ul>
        {[...Array(3)].map((_, index) => (
          <li
            key={index}
            className={cn(
              "flex items-center gap-x-2 border border-b-0 px-3 py-2 text-sm last:border-b",
              index === 0 && "rounded-t-md",
              index === 2 && "rounded-b-md"
            )}
          >
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="ml-auto h-5 w-20 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </li>
        ))}
      </ul>
    );
  }

  if (displayedVisits.length === 0) return null;

  return (
    <ul>
      {displayedVisits.map((visit, index) => (
        <li
          key={index}
          className={cn(
            "flex items-center gap-x-2 border border-b-0 px-3 py-2 text-sm last:border-b",
            index === 0 && "rounded-t-md",
            index === displayedVisits.length - 1 && "rounded-b-md"
          )}
        >
          <img
            src={`https://github.com/${visit.owner}.png`}
            alt={visit.owner}
            className="h-6 w-6 rounded"
          />
          <Link
            className="truncate font-medium hover:underline"
            href={`/${visit.owner}/${visit.repo}/${encodeURIComponent(visit.branch)}`}
          >
            {visit.repo}
          </Link>
          <div className="text-muted-foreground truncate">
            {formatDistanceToNow(new Date(visit.timestamp * 1000))} ago
          </div>
          <Link
            className={cn(
              "ml-auto",
              buttonVariants({ variant: "outline", size: "xs" })
            )}
            href={`/${visit.owner}/${visit.repo}/${encodeURIComponent(visit.branch)}`}
          >
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}
