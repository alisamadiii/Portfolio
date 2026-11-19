"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, CircleHelp, GitBranch, Menu, Plus, Sparkles } from "lucide-react";

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

import { selectProject } from "@/app/actions/workspace";
import { DeployButton } from "@/components/deploy/deploy-dialog";
import { User } from "@/components/user";

import { buttonClass, IconButton } from "../ui/button";
import { useNavDrawer } from "./app-shell";
import { LetterTile } from "../ui/misc";

/**
 * 56px white bar, bottom line. Left: coral "A" logo (→ Home) | divider | project switcher
 * (every page: the workspace is one project at a time). Right: "Edit with AI", help, avatar.
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
      <Link href="/" aria-label="Client Hub, home" className="flex shrink-0 items-center gap-2.5 text-ink">
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

/** Detail pages (/leads/12) don't exist on another project: switching from one lands on Home. */
const switchDestination = (pathname: string) =>
  pathname.split("/").filter(Boolean).length > 1 ? "/" : pathname || "/";

function ProjectSwitcher({
  current,
}: {
  current: { projectId: string; name: string; plan?: string };
}) {
  const trpc = useTRPC();
  const pathname = usePathname() ?? "/";
  const projects = useQuery(trpc.cms.repos.listMine.queryOptions());
  const currentLogo =
    projects.data?.find((p) => p.projectId === current.projectId)?.logoUrl ?? null;
  const [pending, startTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const all = projects.data ?? [];
  const showFilter = all.length > 8;
  const needle = filter.trim().toLowerCase();
  const listed = needle
    ? all.filter((p) => `${p.name ?? ""} ${p.websiteUrl ?? ""} ${p.repo}`.toLowerCase().includes(needle))
    : all;
  const switchTo = (projectId: string) =>
    startTransition(() => selectProject(projectId, switchDestination(pathname)));
  return (
    <>
    <DeployButton open={importOpen} onOpenChange={setImportOpen} />
    <DropdownMenu onOpenChange={(open) => !open && setFilter("")}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-9 min-w-0 max-w-[360px] items-center gap-2 rounded-control bg-subtle pl-1.5 pr-2.5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral",
              pending && "opacity-60"
            )}
          >
            <LetterTile name={current.name} size={24} tone="ink" src={currentLogo} />
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
        {showFilter && (
          <div className="px-2 pb-1">
            <input
              type="search"
              aria-label="Filter sites"
              placeholder="Filter sites"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-8 w-full rounded-control border border-line-strong bg-surface px-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-coral"
            />
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto">
          {listed.map((p) => {
            const name = p.name?.trim() || siteName(p.websiteUrl) || p.repo;
            const active = p.projectId === current.projectId;
            return (
              <DropdownMenuItem
                key={p.projectId}
                onClick={() => !active && switchTo(p.projectId)}
                className={cn("gap-2.5", active && "bg-selected")}
              >
                <LetterTile name={name} size={24} src={p.logoUrl} />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {active && <Check className="size-4 text-coral" aria-hidden />}
              </DropdownMenuItem>
            );
          })}
          {listed.length === 0 && (
            <p className="px-3 py-2 text-[13px] text-faint">No sites match.</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/integrations" />} className="gap-2.5">
          <GitBranch className="size-4" />
          GitHub access
        </DropdownMenuItem>
        {/* The menu must close before the dialog takes focus. */}
        <DropdownMenuItem onClick={() => setTimeout(() => setImportOpen(true), 100)} className="gap-2.5">
          <Plus className="size-4" />
          Import site
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
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
