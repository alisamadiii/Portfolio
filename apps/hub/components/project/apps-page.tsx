"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Search } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { AppCard } from "@/components/ds/features/app-card";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Button, buttonClass, ButtonLink, IconButton } from "@/components/ds/ui/button";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { useEntitlement } from "@/hooks/use-plans";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { useRouteProjectId } from "@/hooks/use-repo";
import { APPS, appState, lockedCta, type AppDef, type AppState } from "@/lib/apps";
import { repoPath } from "@/lib/paths";
import { SUBSCRIPTION_REQUIRED_EVENT } from "@/lib/trpc-errors";

type Filter = "all" | "installed" | "included" | "locked";

/** 0.8–2s "Adding…" beat, so an instant install still reads as work done. */
const fakeAddDelay = () => 800 + Math.random() * 1200;

/** "Website plan" stays; "Free" → "Free plan". */
const planLabel = (label?: string) =>
  !label ? "plan" : /plan$/i.test(label) ? label : `${label} plan`;

/** Add tools to a site. Apps included in the plan are free to add. */
export function AppsPage() {
  const projectId = useRouteProjectId();
  const { entitlement, can } = useEntitlement(projectId || undefined);
  const { installed, install, uninstall, isPending } = useInstalledApps(projectId);
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  // Adding is instant (optimistic), so it feels like nothing happened: hold a
  // short "Adding…" beat (0.8–2s) before the install lands.
  const [adding, setAdding] = useState<string[]>([]);
  const base = repoPath(projectId);

  const add = (app: AppDef) => {
    if (adding.includes(app.id)) return;
    setAdding((ids) => [...ids, app.id]);
    window.setTimeout(() => {
      // Land on the new app's page once it's saved.
      install(app.id, { onSuccess: () => router.push(`${base}/${app.path}`) });
      setAdding((ids) => ids.filter((id) => id !== app.id));
    }, fakeAddDelay());
  };

  const states = useMemo(
    () => APPS.map((app) => ({ app, state: appState(app, installed, can) })),
    [installed, can]
  );
  const anyLocked = states.some((s) => s.state === "locked");
  const q = search.trim().toLowerCase();
  const visible = states.filter(
    ({ app, state }) =>
      (filter === "all" || state === filter) &&
      (!q || app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q))
  );
  const available = visible.filter((s) => s.state !== "locked");
  const locked = visible.filter((s) => s.state === "locked");
  const count = (state: AppState) => states.filter((s) => s.state === state).length;

  const lockedAction = (app: AppDef) =>
    lockedCta(app) === "upgrade" ? (
      <Button
        variant="dark"
        size="sm"
        className="flex-1"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, { detail: { feature: app.feature } })
          )
        }
      >
        Upgrade to add
      </Button>
    ) : (
      <RequestDialog defaultSubject={`Add ${app.name} to my site`}>
        <span className={buttonClass("dark", "sm", "flex-1")}>Ask us to add</span>
      </RequestDialog>
    );

  const grid = (list: typeof states) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      {list.map(({ app, state }) => (
        <AppCard
          key={app.id}
          app={app}
          state={state}
          href={`${base}/${app.path}`}
          onAdd={() => add(app)}
          adding={adding.includes(app.id) || isPending}
          lockedAction={lockedAction(app)}
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <IconButton aria-label={`${app.name} options`} className="size-8 border border-line-strong">
                    <MoreHorizontal className="size-4" />
                  </IconButton>
                }
              />
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => uninstall(app.id)}>Remove from site</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Apps"
        description="Add tools to your site. Apps included in your plan are free to add."
        actions={
          <ButtonLink href="/billing">Compare plans</ButtonLink>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedTabs
          label="Filter apps"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          items={[
            { id: "all", label: "All", count: states.length },
            { id: "installed", label: "Installed", count: count("installed") },
            { id: "included", label: "In your plan", count: count("included") + count("installed") },
            ...(anyLocked ? [{ id: "locked", label: "Upgrade", count: count("locked") }] : []),
          ]}
        />
        <div className="flex-1" />
        <label className="flex h-9 w-[240px] max-w-full items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-dim">
          <Search className="size-4" aria-hidden />
          <input
            type="search"
            aria-label="Search apps"
            placeholder="Search apps"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
      </div>

      {available.length > 0 && (
        <section className="flex flex-col gap-3">
          <span className="text-[13px] font-medium text-dim">
            Included in your {planLabel(entitlement?.label)}
          </span>
          {grid(available)}
        </section>
      )}
      {locked.length > 0 && (
        <section className="flex flex-col gap-3">
          <span className="text-[13px] font-medium text-dim">Available on request</span>
          {grid(locked)}
        </section>
      )}
      {visible.length === 0 && (
        <p className="py-12 text-center text-[13px] text-dim">No apps match.</p>
      )}
    </>
  );
}
