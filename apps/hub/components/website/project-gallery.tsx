"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { Github } from "@workspace/ui/icons/social";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { FREE_PLAN, type Entitlement } from "@workspace/trpc/lib/payment/plans";
import type { FramePolicy } from "@workspace/trpc/lib/frame-policy";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { repoPath } from "@/lib/paths";

import { DeployButton } from "@/components/deploy/deploy-dialog";
import { usePlans } from "@/hooks/use-plans";
import {
  CloudOff,
  Globe,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "@/components/icon";

// Logical size the live site renders at inside the preview iframe before it's
// scaled down to the card width. A desktop-ish viewport so previews look like
// the real homepage, not a mobile breakpoint.
const FRAME_W = 1280;
const FRAME_H = 800;

type Project = {
  owner: string;
  repo: string;
  projectId: string;
  source?: string;
  private?: boolean;
  updatedAt?: string | null;
  websiteUrl?: string | null;
};

type Site = {
  id: string;
  status: { up: boolean };
};

// Card face when the site can't be iframed: its security headers refuse
// framing (blocked) or it didn't answer (unreachable).
const PreviewNotice = ({
  url,
  policy,
}: {
  url: string;
  policy: "blocked" | "unreachable";
}) => {
  const Icon = policy === "blocked" ? ShieldCheck : CloudOff;
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="bg-background/70 grid size-10 place-items-center rounded-full">
        <Icon className="size-5" />
      </span>
      <p className="text-foreground/80 truncate text-[13px] font-semibold">
        {hostOf(url)}
      </p>
      <p className="text-[11.5px] leading-snug">
        {policy === "blocked"
          ? "Preview hidden by the site's security settings"
          : "Site didn't respond"}
      </p>
    </div>
  );
};

// Scaled, non-interactive live preview of the site. Measures its own width and
// scales a fixed FRAME_W×FRAME_H iframe to fit, so it reads like a thumbnail.
// The iframe only mounts once the server confirmed the site allows framing.
const PreviewFrame = ({
  url,
  policy,
}: {
  url: string | null;
  policy: FramePolicy | undefined;
}) => {
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
      {url && (policy === "blocked" || policy === "unreachable") ? (
        <PreviewNotice url={url} policy={policy} />
      ) : url && policy === "frameable" && scale > 0 ? (
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
      ) : url && !policy ? (
        <Skeleton className="h-full w-full rounded-none" />
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
  policy,
}: {
  project: Project;
  site?: Site;
  entitlement: Entitlement;
  policy: FramePolicy | undefined;
}) => {
  const url = project.websiteUrl ?? null;
  return (
    <Link
      href={repoPath(project.projectId)}
      className="bg-card hover:border-foreground/20 group flex flex-col overflow-hidden rounded-lg border transition"
    >
      <PreviewFrame url={url} policy={policy} />
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

// Agency-plan project: dark framed card with a coral plan chip, so the
// projects running leads + ads stand apart from plain websites.
const AgencyProjectCard = ({
  project,
  site,
  entitlement,
  policy,
}: {
  project: Project;
  site?: Site;
  entitlement: Entitlement;
  policy: FramePolicy | undefined;
}) => {
  const url = project.websiteUrl ?? null;
  // "Agency · Launch" → "Launch"
  const tier = entitlement.label.split("·").pop()?.trim() ?? entitlement.label;
  return (
    <Link
      href={repoPath(project.projectId)}
      className="group flex flex-col overflow-hidden rounded-lg bg-[#141210] text-white shadow-[0_18px_50px_-20px_rgba(252,132,100,0.55)] ring-1 ring-white/10 transition hover:ring-[#fc8464]/50"
    >
      <div className="m-2 mb-0 overflow-hidden rounded-md ring-1 ring-white/10">
        <PreviewFrame url={url} policy={policy} />
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{project.repo}</p>
          <p className="truncate text-xs text-white/55">
            {url ? hostOf(url) : project.repo}
          </p>
          <p className="truncate pt-1.5 text-[11px] text-white/40">
            Leads, ads and website
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#fc8464] to-[#f5a35c] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1c0f0a]">
            <Sparkles className="size-3" />
            {tier}
          </span>
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

  // Which sites refuse to be iframed here (security headers); checked
  // server-side since the browser hides why a cross-origin frame stays blank.
  const framePolicyQuery = useQuery(
    trpc.cms.repos.framePolicies.queryOptions(
      {
        origin:
          typeof window === "undefined"
            ? "https://hub.alisamadii.com"
            : window.location.origin,
      },
      { enabled: !!user && projects.length > 0, staleTime: 30 * 60 * 1000 }
    )
  );
  // Unknown (check failed, or a URL the server skipped) falls back to the
  // plain iframe rather than a skeleton that never resolves.
  const policyFor = (p: Project): FramePolicy | undefined =>
    !p.websiteUrl
      ? undefined
      : framePolicyQuery.isError
        ? "frameable"
        : framePolicyQuery.data
          ? (framePolicyQuery.data[p.projectId] ?? "frameable")
          : undefined;

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
          {projects.map((p) => {
            const entitlement = plans.forRepo(p.projectId);
            const Card =
              entitlement.product === "agency" ? AgencyProjectCard : ProjectCard;
            return (
              <Card
                key={`${p.owner}/${p.repo}`}
                project={p}
                site={siteFor(p)}
                entitlement={entitlement}
                policy={policyFor(p)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
