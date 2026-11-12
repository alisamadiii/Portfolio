"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  GitBranch,
  LayoutGrid,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useTRPC } from "@workspace/trpc/client";
import { FREE_PLAN } from "@workspace/trpc/lib/payment/plans";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DeployButton } from "@/components/deploy/deploy-dialog";
import { Badge, StatusText } from "@/components/ds/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { EmptyState, LetterTile } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { PageHeader } from "@/components/ds/layout/page-header";
import { hostOf } from "@/components/project/site-preview";
import { usePlans } from "@/hooks/use-plans";
import { repoPath } from "@/lib/paths";

type Filter = "all" | "paid" | "free";

type Row = {
  projectId: string;
  name: string;
  repo: string;
  isPrivate: boolean;
  source: "github" | "upload";
  websiteUrl: string | null;
  planLabel: string;
  isFree: boolean;
  /** undefined = status not loaded yet; null = no domain to check. */
  up: boolean | null | undefined;
  responseMs: number | null;
};

/** Every site the user manages, with its plan and live status. */
export function SitesPage() {
  const user = useCurrentUser().data?.user ?? null;
  const trpc = useTRPC();
  const router = useRouter();
  const plans = usePlans();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const projects = useQuery(
    trpc.cms.repos.listMine.queryOptions(undefined, { enabled: !!user, staleTime: 5 * 60 * 1000 })
  );
  const sites = useQuery(trpc.websites.getMine.queryOptions(undefined, { enabled: !!user }));

  const rows = useMemo<Row[]>(() => {
    const siteFor = (owner: string, repo: string) =>
      sites.data?.find((s) => s.id.toLowerCase() === `${owner}/${repo}`.toLowerCase());
    return (projects.data ?? []).map((p) => {
      const entitlement = plans.forRepo(p.projectId);
      const site = siteFor(p.owner, p.repo);
      return {
        projectId: p.projectId,
        name: p.websiteUrl ? hostOf(p.websiteUrl) : p.repo,
        repo: p.repo,
        isPrivate: p.private,
        source: p.source === "upload" ? "upload" : "github",
        websiteUrl: p.websiteUrl,
        planLabel: entitlement.label,
        isFree: entitlement.plan === FREE_PLAN,
        up: !p.websiteUrl ? null : sites.data ? Boolean(site?.status.up) : undefined,
        responseMs: site?.status.responseTimeMs ?? null,
      };
    });
  }, [projects.data, sites.data, plans]);

  const counts = {
    all: rows.length,
    paid: rows.filter((r) => !r.isFree).length,
    free: rows.filter((r) => r.isFree).length,
    live: rows.filter((r) => r.up === true).length,
  };

  const visible = rows.filter((r) => {
    if (filter === "paid" && r.isFree) return false;
    if (filter === "free" && !r.isFree) return false;
    const q = search.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.repo.toLowerCase().includes(q);
  });

  const columns: Column<Row>[] = [
    {
      key: "site",
      header: "Site",
      width: "minmax(240px, 2fr)",
      cell: (r) => (
        <span className="flex items-center gap-3">
          <LetterTile name={r.name} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-ink">{r.name}</span>
            <span className="truncate text-xs text-dim">
              {r.repo}
              {r.isPrivate && " · private"}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      width: "minmax(120px, 1fr)",
      cell: (r) =>
        r.isFree ? <Badge tone="neutral">Free</Badge> : <Badge tone="coral">{r.planLabel}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      width: "minmax(100px, 1fr)",
      cell: (r) =>
        r.up === null ? (
          <StatusText tone="neutral">No domain</StatusText>
        ) : r.up === undefined ? (
          <span className="text-faint">—</span>
        ) : r.up ? (
          <StatusText>Live</StatusText>
        ) : (
          <StatusText tone="danger">Down</StatusText>
        ),
    },
    {
      key: "response",
      header: "Response",
      width: "minmax(90px, 1fr)",
      cell: (r) =>
        r.responseMs != null ? <span>{r.responseMs} ms</span> : <span className="text-faint">—</span>,
    },
    {
      key: "source",
      header: "Source",
      width: "minmax(110px, 1fr)",
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="size-3.5" aria-hidden />
          {r.source === "github" ? "GitHub" : "Uploaded"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "88px",
      align: "end",
      cell: (r) => (
        <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {r.websiteUrl && (
            <IconButton
              aria-label={`Open ${r.name}`}
              className="size-8"
              onClick={() => window.open(r.websiteUrl!, "_blank", "noopener,noreferrer")}
            >
              <ArrowUpRight className="size-4" />
            </IconButton>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <IconButton aria-label={`More for ${r.name}`} className="size-8">
                  <MoreHorizontal className="size-4" />
                </IconButton>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={repoPath(r.projectId, "website")} />}>
                <Sparkles className="size-4" />
                Edit with AI
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={repoPath(r.projectId, "domain")} />}>
                <Link2 className="size-4" />
                Domain settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const loading = !!user && projects.isPending;

  return (
    <>
      <PageHeader
        title="Sites"
        count={projects.data ? rows.length : undefined}
        description="Every website you manage, with its plan and live status."
        actions={
          <>
            <ButtonLink href="/integrations" icon={<GitBranch className="size-[15px]" />}>
              GitHub access
            </ButtonLink>
            <DeployButton
              trigger={(open) => (
                <Button variant="primary" icon={<Plus className="size-4" />} onClick={open}>
                  Import site
                </Button>
              )}
            />
          </>
        }
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] rounded-card border border-line bg-surface">
        {[
          { label: "Total sites", value: counts.all },
          { label: "Live", value: counts.live, dot: true },
          { label: "Website plan", value: counts.paid },
          { label: "Free", value: counts.free },
        ].map((k, i) => (
          <div key={k.label} className={i > 0 ? "border-l border-divider px-6 py-4" : "px-6 py-4"}>
            <p className="text-[13px] text-dim">{k.label}</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-[-0.01em]">
              {k.dot && <span className="size-[7px] rounded-full bg-success" aria-hidden />}
              {projects.data ? k.value : "—"}
            </p>
          </div>
        ))}
      </section>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3">
          <SegmentedTabs
            label="Filter sites by plan"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            items={[
              { id: "all", label: "All", count: counts.all },
              { id: "paid", label: "Website plan", count: counts.paid },
              { id: "free", label: "Free", count: counts.free },
            ]}
          />
          <div className="flex-1" />
          <label className="flex h-9 w-[220px] max-w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-dim">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              aria-label="Search sites"
              placeholder="Search sites"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
          </label>
        </div>
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.projectId}
          onRowClick={(r) => router.push(repoPath(r.projectId))}
          empty={
            loading ? (
              <div className="px-6 py-12 text-center text-[13px] text-dim">Loading your sites…</div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<LayoutGrid className="size-5" />}
                title="No sites yet"
                text="Import a repository or upload a folder and it shows up here with its plan and live status."
              />
            ) : (
              <div className="px-6 py-12 text-center text-[13px] text-dim">No sites match.</div>
            )
          }
        />
        <div className="border-t border-divider px-6 py-3 text-[13px] text-dim">
          {projects.data ? `Showing ${visible.length} of ${rows.length} sites` : "—"}
        </div>
      </Card>
    </>
  );
}
