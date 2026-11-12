"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, CircleHelp, Menu, Sparkles } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";
import { useTRPC } from "@workspace/trpc/client";
import { cn } from "@workspace/ui/lib/utils";

import { User } from "@/components/user";
import { repoPath } from "@/lib/paths";

import { buttonClass, IconButton } from "../ui/button";
import { useNavDrawer } from "./app-shell";
import { LetterTile } from "../ui/misc";

/**
 * 56px white bar, bottom line. Left: coral "A" logo (→ all sites) | divider | project switcher.
 * Right: "Edit with AI" (project only), help, avatar. One UI for every client: no mode toggle.
 */
export function TopBar({
  project,
  editorHref,
}: {
  project?: { projectId: string; name: string; plan?: string };
  editorHref?: string;
}) {
  const drawer = useNavDrawer();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:pl-5 sm:pr-4">
      {drawer && (
        <IconButton aria-label="Open navigation" className="-ml-1 md:hidden" onClick={drawer.open}>
          <Menu className="size-[18px]" />
        </IconButton>
      )}
      <Link href="/" aria-label="Client Hub, all sites" className="flex shrink-0 items-center gap-2.5 text-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agency-icon.png" alt="" width={28} height={28} className="size-7 rounded-[7px]" />
        {!project && <span className="text-[15px] font-semibold tracking-[-0.01em]">Client Hub</span>}
      </Link>
      {project && (
        <>
          <span className="hidden h-[22px] w-px bg-line sm:block" />
          <ProjectSwitcher current={project} />
        </>
      )}
      <div className="min-w-2 flex-1" />
      {project && editorHref && (
        <Link
          href={editorHref}
          aria-label="Edit with AI"
          className={buttonClass("outline", "md", "shrink-0 px-2.5 sm:px-3.5")}
        >
          <Sparkles className="size-[15px] text-coral" aria-hidden />
          <span className="hidden sm:inline">Edit with AI</span>
        </Link>
      )}
      {/* RequestDialog renders its own <button> trigger, so the child is a styled span. */}
      <RequestDialog>
        <span
          aria-label="Help and support"
          className="hidden size-9 items-center justify-center rounded-control text-ink-3 hover:bg-hover sm:inline-flex"
        >
          <CircleHelp className="size-[18px]" />
        </span>
      </RequestDialog>
      <User align="end" className="size-8" />
    </header>
  );
}

function ProjectSwitcher({
  current,
}: {
  current: { projectId: string; name: string; plan?: string };
}) {
  const trpc = useTRPC();
  const projects = useQuery(trpc.cms.repos.listMine.queryOptions());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 min-w-0 max-w-[360px] items-center gap-2 rounded-control bg-subtle pl-1.5 pr-2.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <LetterTile name={current.name} size={24} tone="ink" />
            <span className="truncate text-sm font-medium">{current.name}</span>
            {current.plan && <span className="hidden shrink-0 whitespace-nowrap text-xs text-dim sm:inline">{current.plan}</span>}
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-dim">Switch site</DropdownMenuLabel>
        </DropdownMenuGroup>
        {(projects.data ?? []).map((p) => {
          const name = siteName(p.websiteUrl) ?? p.repo;
          const active = p.projectId === current.projectId;
          return (
            <DropdownMenuItem
              key={p.projectId}
              render={<Link href={repoPath(p.projectId)} />}
              className={cn("gap-2.5", active && "bg-selected")}
            >
              <LetterTile name={name} size={24} />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {active && <Check className="size-4 text-coral" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" />}>All sites</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "www.example.com" from a stored website URL, or null. */
export function siteName(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  try {
    return new URL(websiteUrl).host || null;
  } catch {
    return websiteUrl.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
}
