"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { Github } from "@workspace/ui/icons/social";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { FREE_PLAN, type Entitlement } from "@workspace/trpc/lib/payment/plans";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { repoPath } from "@/lib/paths";

import { DeployButton } from "@/components/deploy/deploy-dialog";
import { usePlans } from "@/hooks/use-plans";
import { Globe, LockKeyhole } from "@/components/icon";

// Logical size the live site renders at inside the preview iframe before it's
// scaled down to the card width. A desktop-ish viewport so previews look like
// the real homepage, not a mobile breakpoint.
const FRAME_W = 1280;
const FRAME_H = 800;

type Project = {
  owner: string;
  repo: string;
  repoId: number;
  source?: string;
  private?: boolean;
  updatedAt?: string | null;
  websiteUrl?: string | null;
};

type Site = {
  id: string;
  status: { up: boolean };
};

// Scaled, non-interactive live preview of the site. Measures its own width and
// scales a fixed FRAME_W×FRAME_H iframe to fit, so it reads like a thumbnail.
const PreviewFrame = ({ url }: { url: string | null }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(box.clientWidth / FRAME_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className="bg-accent pointer-events-none relative aspect-[16/10] overflow-hidden"
    >
      {url && scale > 0 ? (
        <iframe
          src={url}
          title="preview"
          aria-hidden
          tabIndex={-1}
          loading="lazy"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 origin-top-left border-0"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${scale})`,
          }}
        />
      ) : (
        <div className="text-muted-foreground/50 grid h-full place-items-center">
          <Globe className="size-8" />
        </div>
      )}
    </div>
  );
};

const LivePill = ({ up }: { up: boolean }) => (
  <span
    className={cn(
      "shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
      up
        ? "bg-status-success-bg text-status-success"
        : "bg-status-danger-bg text-status-danger"
    )}
  >
    {up ? "Live" : "Down"}
  </span>
);

// Plan badge for a project card, straight from the project's entitlement.
const PlanBadge = ({ entitlement }: { entitlement: Entitlement }) => (
  <span
    className={cn(
      "shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
      entitlement.plan === FREE_PLAN
        ? "bg-status-neutral-bg text-status-neutral"
        : "bg-status-success-bg text-status-success"
    )}
  >
    {entitlement.label}
  </span>
);

// Bare host for the secondary line ("https://acme.com/" → "acme.com").
const hostOf = (url: string) =>
  url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

// GitHub config indicator (non-clickable — the card is a link).
const ConfigChips = () => (
  <div className="flex items-center gap-1.5 pt-1.5">
    <span title="GitHub repository" className="text-foreground">
      <Github className="size-3.5" />
    </span>
  </div>
);

const ProjectCard = ({
  project,
  site,
  entitlement,
}: {
  project: Project;
  site?: Site;
  entitlement: Entitlement;
}) => {
  const url = project.websiteUrl ?? null;
  return (
    <Link
      href={repoPath(project.repoId)}
      className="bg-card hover:border-foreground/20 group flex flex-col overflow-hidden rounded-lg border transition"
    >
      <PreviewFrame url={url} />
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            <span className="truncate">{project.repo}</span>
            {project.source === "upload" ? (
              <span className="text-muted-foreground bg-muted shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
                Uploaded
              </span>
            ) : (
              project.private && (
                <LockKeyhole className="size-3 shrink-0 opacity-50" />
              )
            )}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {url ? hostOf(url) : project.repo}
          </p>
          <ConfigChips />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <PlanBadge entitlement={entitlement} />
          {site && <LivePill up={site.status.up} />}
        </div>
      </div>
    </Link>
  );
};

const CardSkeleton = () => (
  <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
    <Skeleton className="aspect-[16/10] rounded-none" />
    <div className="space-y-2 px-4 py-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export function ProjectGallery() {
  const user = useCurrentUser().data?.user ?? null;
  const trpc = useTRPC();

  // Every project the caller can access, derived from the session — one call,
  // no per-account fan-out.
  const projectsQuery = useQuery(
    trpc.cms.repos.listMine.queryOptions(undefined, {
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
    })
  );
  const projects = (projectsQuery.data as Project[] | undefined) ?? [];

  const { data: sites } = useQuery(
    trpc.websites.getMine.queryOptions(undefined, { enabled: !!user })
  );

  const isPending = !!user && projectsQuery.isPending;

  // Match a project to its pinged live-status row by owner/repo id.
  const siteFor = (p: Project): Site | undefined =>
    (sites as Site[] | undefined)?.find((s) => s.id === `${p.owner}/${p.repo}`);

  const plans = usePlans();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold tracking-tight">
          Your projects
          {projects.length > 0 && (
            <span className="text-muted-foreground ml-2 font-medium">
              {projects.length}
            </span>
          )}
        </h2>
        <DeployButton />
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : projects.length === 0 ? (
        <p className="bg-card text-muted-foreground rounded-lg border px-5 py-8 text-center text-[13.5px]">
          No projects yet. You'll see your website here once it's set up.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => (
            <ProjectCard
              key={`${p.owner}/${p.repo}`}
              project={p}
              site={siteFor(p)}
              entitlement={plans.forRepo(p.repoId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
