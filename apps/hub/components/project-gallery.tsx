"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { Github } from "@workspace/ui/icons/social";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { repoPath } from "@/lib/paths";

import { DeployButton } from "@/components/deploy/deploy-dialog";
import { Globe, LockKeyhole } from "@/components/icon";

// Logical size the live site renders at inside the preview iframe before it's
// scaled down to the card width. A desktop-ish viewport so previews look like
// the real homepage, not a mobile breakpoint.
const FRAME_W = 1280;
const FRAME_H = 800;

type Project = {
  owner: string;
  repo: string;
  private?: boolean;
  updatedAt?: string | null;
  websiteUrl?: string | null;
  plan?: string | null;
  freeLife?: boolean;
  cloudflare?: boolean;
  dns?: boolean;
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

// Plan badge for a project card. `undefined` plan ⇒ no subscription row.
// free_life (agency gift, from cms_org_repo) takes precedence over any plan.
const PlanBadge = ({
  plan,
  freeLife,
}: {
  plan: string | undefined;
  freeLife?: boolean;
}) => {
  const label = freeLife
    ? "Free for life"
    : plan === "free_lifetime"
      ? "Free for life"
      : plan === "free"
        ? "Free"
        : plan === "paid"
          ? "Paid"
          : "No plan";
  const style = freeLife
    ? "bg-status-success-bg text-status-success"
    : plan === "paid"
      ? "bg-status-success-bg text-status-success"
      : plan === "free" || plan === "free_lifetime"
        ? "bg-status-info-bg text-status-info"
        : "bg-status-neutral-bg text-status-neutral";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
        style
      )}
    >
      {label}
    </span>
  );
};

// Bare host for the secondary line ("https://acme.com/" → "acme.com").
const hostOf = (url: string) =>
  url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

type ProjectFlags = { cloudflare: boolean; dns: boolean };

// Small orange-cloud mark for the Cloudflare chip.
const CloudflareMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M16.5 16.8c.14-.5.09-.96-.16-1.3-.22-.31-.6-.5-1.05-.52l-8.6-.11a.17.17 0 0 1-.14-.07.18.18 0 0 1-.02-.15.23.23 0 0 1 .2-.16l8.69-.11c1.03-.05 2.14-.88 2.53-1.9l.5-1.3a.31.31 0 0 0 .01-.17A5.67 5.67 0 0 0 7.57 9.8a2.55 2.55 0 0 0-3.98 2.67A3.63 3.63 0 0 0 .05 16.1c0 .18.01.36.04.54a.17.17 0 0 0 .17.15h15.87a.22.22 0 0 0 .21-.16z" />
  </svg>
);

// GitHub / Cloudflare / DNS config indicators (non-clickable — the card is a link).
const ConfigChips = ({ flags }: { flags?: ProjectFlags }) => (
  <div className="flex items-center gap-1.5 pt-1.5">
    <span title="GitHub repository" className="text-foreground">
      <Github className="size-3.5" />
    </span>
    <span
      title={
        flags?.cloudflare
          ? "Cloudflare configured"
          : "Cloudflare not configured"
      }
      className={
        flags?.cloudflare ? "text-[#F38020]" : "text-muted-foreground/35"
      }
    >
      <CloudflareMark className="size-3.5" />
    </span>
    <span
      title={flags?.dns ? "DNS configured" : "DNS not configured"}
      className={flags?.dns ? "text-foreground" : "text-muted-foreground/35"}
    >
      <Globe className="size-3.5" />
    </span>
  </div>
);

const ProjectCard = ({
  project,
  site,
  plan,
  freeLife,
  flags,
}: {
  project: Project;
  site?: Site;
  plan?: string;
  freeLife?: boolean;
  flags?: ProjectFlags;
}) => {
  const url = project.websiteUrl ?? null;
  return (
    <Link
      href={repoPath(project.repo)}
      className="bg-card hover:border-foreground/20 group flex flex-col overflow-hidden rounded-lg border transition"
    >
      <PreviewFrame url={url} />
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            <span className="truncate">{project.repo}</span>
            {project.private && (
              <LockKeyhole className="size-3 shrink-0 opacity-50" />
            )}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {url ? hostOf(url) : project.repo}
          </p>
          <ConfigChips flags={flags} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <PlanBadge plan={plan} freeLife={freeLife} />
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
  const { user } = useUser();
  const trpc = useTRPC();
  const { data: currentUser } = useCurrentUser();

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
    trpc.websites.getMine.queryOptions(undefined, { enabled: !!currentUser })
  );

  const isPending = !!user && projectsQuery.isPending;

  // Cloudflare/DNS config chips now ride along in the listMine payload.
  const flagsFor = (p: Project): ProjectFlags => ({
    cloudflare: !!p.cloudflare,
    dns: !!p.dns,
  });

  // Match a project to its pinged live-status row by owner/repo id.
  const siteFor = (p: Project): Site | undefined =>
    (sites as Site[] | undefined)?.find((s) => s.id === `${p.owner}/${p.repo}`);

  const planFor = (p: Project): string | undefined => p.plan ?? undefined;

  const freeLifeFor = (p: Project): boolean => !!p.freeLife;

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
              plan={planFor(p)}
              freeLife={freeLifeFor(p)}
              flags={flagsFor(p)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
