"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, CircleHelp, Sparkles } from "lucide-react";

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

import { buttonClass } from "../ui/button";
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
  return (
    <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-3 border-b border-line bg-surface pl-5 pr-4">
      <Link href="/" aria-label="Client Hub, all sites" className="flex items-center gap-2.5 text-ink">
        <span className="flex size-7 items-center justify-center rounded-[7px] bg-coral text-[15px] font-bold text-ink">
          A
        </span>
        {!project && <span className="text-[15px] font-semibold tracking-[-0.01em]">Client Hub</span>}
      </Link>
      {project && (
        <>
          <span className="h-[22px] w-px bg-line" />
          <ProjectSwitcher current={project} />
        </>
      )}
      <div className="flex-1" />
      {project && editorHref && (
        <Link href={editorHref} className={buttonClass("outline")}>
          <Sparkles className="size-[15px] text-coral" aria-hidden />
          Edit with AI
        </Link>
      )}
      {/* RequestDialog renders its own <button> trigger, so the child is a styled span. */}
      <RequestDialog>
        <span
          aria-label="Help and support"
          className="inline-flex size-9 items-center justify-center rounded-control text-ink-3 hover:bg-hover"
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
            className="inline-flex h-9 max-w-[min(60vw,360px)] items-center gap-2 rounded-control bg-subtle pl-1.5 pr-2.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <LetterTile name={current.name} size={24} tone="ink" />
            <span className="truncate text-sm font-medium">{current.name}</span>
            {current.plan && <span className="hidden text-xs text-dim sm:inline">{current.plan}</span>}
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
