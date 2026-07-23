"use client";

import { useConfig } from "@/contexts/config-context";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, History } from "lucide-react";

import type { EntryHistoryItem } from "@/types/api";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { getInitialsFromName } from "@/lib/utils/avatar";

function HistoryItemContent({
  item,
  compact = false,
}: {
  item: EntryHistoryItem;
  compact?: boolean;
}) {
  const authorName =
    item.commit.author?.name || item.author?.login || "Unknown author";
  const authorDate = item.commit.author?.date
    ? new Date(item.commit.author.date)
    : null;

  return (
    <>
      <Avatar className={compact ? "size-7" : "h-8 w-8"}>
        <AvatarImage
          src={
            item.author?.login
              ? `https://github.com/${item.author.login}.png`
              : undefined
          }
          alt={`${authorName}'s avatar`}
        />
        <AvatarFallback>{getInitialsFromName(authorName)}</AvatarFallback>
      </Avatar>
      <div
        className={
          compact
            ? "overflow-hidden text-left"
            : "ml-3 overflow-hidden text-left"
        }
      >
        <div className={compact ? "truncate" : "truncate text-sm font-medium"}>
          {authorName}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {authorDate
            ? `${formatDistanceToNow(authorDate)} ago`
            : "Unknown date"}
        </div>
      </div>
    </>
  );
}

export function EntryHistoryBlock({
  path,
  history,
}: {
  path: string;
  history: EntryHistoryItem[];
}) {
  const { config } = useConfig();

  if (!history || history.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-1 text-sm">
      {history.slice(0, 3).map((item) => (
        <a
          href={item.html_url}
          target="_blank"
          rel="noopener noreferrer"
          key={item.sha}
          className="hover:bg-accent ring-offset-background focus-visible:ring-ring flex items-center rounded-lg px-3 py-2 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <HistoryItemContent item={item} />
        </a>
      ))}
      {history.length > 3 && (
        <a
          href={`https://github.com/${config?.owner}/${config?.repo}/commits/${encodeURIComponent(config!.branch)}/${path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-accent ring-offset-background focus-visible:ring-ring flex items-center rounded-lg px-3 py-2 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="mr-4">See all changes</span>
          {/* <ArrowUpRight className="h-3 w-3 ml-auto min-ml-4 opacity-50" /> */}
        </a>
      )}
    </div>
  );
}

export function EntryHistoryDropdown({
  path,
  history,
  triggerVariant = "ghost",
  triggerSize = "icon",
}: {
  path: string;
  history: EntryHistoryItem[];
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
}) {
  const { config } = useConfig();

  if (!history || history.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={triggerVariant} size={triggerSize}>
          <History />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-3xs">
        {history.slice(0, 3).map((item) => (
          <DropdownMenuItem key={item.sha} asChild>
            <a
              href={item.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 truncate"
            >
              <HistoryItemContent item={item} compact />
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href={`https://github.com/${config?.owner}/${config?.repo}/commits/${encodeURIComponent(config!.branch)}/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center"
          >
            View on GitHub
            <ArrowUpRight className="text-muted-foreground ml-auto size-3" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
