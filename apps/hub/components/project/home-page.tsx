"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowUpRight, Building2, Sparkles } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { BUSINESS_STEPS } from "@/components/agency/business-info-config";
import { doneCount, stepStatuses } from "@/components/agency/business-info/status";
import { useAgencyOptional } from "@/components/agency/use-agency";
import { Button, ButtonAnchor, ButtonLink } from "@/components/ds/ui/button";
import { Card, TextLink } from "@/components/ds/ui/card";
import { SetupChecklist, type ChecklistItem } from "@/components/ds/ui/checklist";
import { IconTile, InfoStrip } from "@/components/ds/ui/misc";
import { useEntitlement } from "@/hooks/use-plans";
import { useInstalledApps } from "@/hooks/use-installed-apps";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { APPS, appState, lockedCta } from "@/lib/apps";
import { repoPath } from "@/lib/paths";

import { hostOf, SitePreview } from "./site-preview";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function HomePage() {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const project = useProject();
  const agency = useAgencyOptional();
  const user = useCurrentUser().data?.user ?? null;
  const { entitlement, can } = useEntitlement(projectId || undefined);
  const { installed, install, isPending } = useInstalledApps(projectId);

  const websiteUrl = project?.websiteUrl ?? null;
  const sites = useQuery(trpc.websites.getMine.queryOptions(undefined, { enabled: !!websiteUrl }));
  const site = sites.data?.find(
    (s) => s.id.toLowerCase() === `${project?.owner}/${project?.repo}`.toLowerCase()
  );

  // Business info progress needs agency data; without it the row stays todo.
  const info = useQuery(
    trpc.agency.businessInfo.get.queryOptions({ projectId }, { enabled: !!agency })
  );
  const campaigns = useQuery(
    trpc.agency.campaigns.list.queryOptions({ projectId }, { enabled: !!agency })
  );
  const infoDone = agency ? doneCount(stepStatuses(info.data ?? {}, campaigns.data ?? [])) : 0;

  // GitHub projects without the App installed can't be edited: surface the
  // install link here (the editor shows its own overlay).
  const installation = useQuery(
    trpc.cms.repos.installationStatus.queryOptions(
      { projectId },
      { enabled: !!projectId && project?.source === "github" }
    )
  );

  const base = repoPath(projectId);
  const firstName = user?.name?.split(" ")[0];

  const live = site?.status.up === true;
  const domainSet = Boolean(websiteUrl);
  const items: ChecklistItem[] = [
    {
      id: "live",
      title: "Your website is live",
      state: live ? "done" : "todo",
      href: domainSet ? undefined : `${base}/domain`,
      meta: domainSet && !live ? (sites.isPending ? "Checking…" : "Not reachable") : undefined,
    },
    {
      id: "domain",
      title: "Connect your domain",
      state: domainSet ? "done" : "todo",
      href: `${base}/domain`,
    },
    {
      id: "business-info",
      title: "Complete your business info",
      state: infoDone >= BUSINESS_STEPS.length ? "done" : "todo",
      meta: agency ? `${infoDone} of ${BUSINESS_STEPS.length} sections` : undefined,
      href: `${base}/business-info`,
    },
    {
      id: "leads",
      title: "Start getting leads from your website",
      state: installed.includes("leads") ? "done" : "todo",
      linkLabel: "Add Leads app",
      href: `${base}/apps`,
    },
  ];
  if (installation.data?.status === "missing") {
    items.unshift({
      id: "github",
      title: "Install the GitHub App on your repository",
      state: "active",
      description: "The editor can't read or publish your site until the app is installed.",
      action: installation.data.installUrl ? (
        <ButtonAnchor
          variant="primary"
          size="sm"
          href={installation.data.installUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Install GitHub App
        </ButtonAnchor>
      ) : (
        <span className="text-[13px] text-dim">Ask the repository owner to install it.</span>
      ),
    });
  } else {
    const firstTodo = items.find((i) => i.state === "todo");
    if (firstTodo) {
      firstTodo.state = "active";
      firstTodo.action = firstTodo.href ? (
        <ButtonLink variant="primary" size="sm" href={firstTodo.href}>
          {firstTodo.linkLabel ?? "Continue"}
        </ButtonLink>
      ) : undefined;
    }
  }

  const recommended = APPS.filter((a) => !installed.includes(a.id));
  const appsLabel = `${installed.length} ${installed.length === 1 ? "app" : "apps"} installed`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-dim">{format(new Date(), "EEEE, MMMM d")}</span>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      <InfoStrip
        items={[
          {
            label: entitlement?.label ?? "—",
            value: (
              <Link href="/billing" className="font-medium text-coral-text">
                Compare plans
              </Link>
            ),
          },
          {
            label: websiteUrl ? hostOf(websiteUrl) : "No domain yet",
            value: !websiteUrl ? (
              <Link href={`${base}/domain`} className="font-medium text-coral-text">
                Add your domain
              </Link>
            ) : sites.isPending ? (
              <span className="text-faint">—</span>
            ) : live ? (
              <span className="inline-flex items-center gap-1.5 text-success-text">
                <span className="size-[7px] rounded-full bg-success" />
                Online
                {site?.status.responseTimeMs != null && ` · ${site.status.responseTimeMs} ms`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-danger">
                <span className="size-[7px] rounded-full bg-danger" />
                Offline
              </span>
            ),
          },
          {
            label: appsLabel,
            value: (
              <Link href={`${base}/apps`} className="font-medium text-coral-text">
                Browse apps
              </Link>
            ),
          },
        ]}
        trailing={
          <ButtonLink
            variant="ghost"
            href={`${base}/business-info`}
            icon={<Building2 className="size-4" />}
            className="text-ink hover:text-ink-2"
          >
            Edit business info
          </ButtonLink>
        }
      />

      <Card className="grid gap-6 p-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
        <SitePreview projectId={projectId} websiteUrl={websiteUrl} />
        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-dim">Your website</span>
          <h2 className="text-xl font-semibold tracking-[-0.01em]">Change your site by describing it</h2>
          <p className="text-sm leading-relaxed text-dim">
            Tell the AI what to update, like new photos, prices or a new section, and see it on your
            site before you publish.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <ButtonLink
              variant="primary"
              href={`${base}/website`}
              icon={<Sparkles className="size-[15px]" />}
            >
              Edit with AI
            </ButtonLink>
            {websiteUrl && (
              <ButtonAnchor
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                trailingIcon={<ArrowUpRight className="size-3.5" />}
              >
                View site
              </ButtonAnchor>
            )}
          </div>
        </div>
      </Card>

      <SetupChecklist title="Getting started" items={items} />

      {recommended.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recommended for your business</h2>
            <TextLink href={`${base}/apps`}>See all apps</TextLink>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((app) => {
              const state = appState(app, installed, can);
              const Icon = app.icon;
              const Logo = app.logo;
              return (
                <Card key={app.id} className="flex flex-col gap-3 p-[18px]">
                  <div className="flex items-center gap-3">
                    <IconTile
                      size={36}
                      tone={Logo ? "brand" : state === "locked" ? "neutral" : "coral"}
                    >
                      {Logo ? (
                        <Logo className="size-[18px]" />
                      ) : (
                        <Icon className="size-[18px]" strokeWidth={1.8} />
                      )}
                    </IconTile>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{app.name}</span>
                      <span
                        className={
                          state === "locked" ? "text-xs text-dim" : "text-xs text-success-text"
                        }
                      >
                        {state === "locked" ? "Not in your plan" : "Included in your plan"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] leading-normal text-dim">{app.description}</p>
                  {state === "locked" ? (
                    <ButtonLink variant="dark" size="sm" href={`${base}/apps`}>
                      {lockedCta(app) === "upgrade" ? "Upgrade" : "Ask us"}
                    </ButtonLink>
                  ) : (
                    <Button size="sm" onClick={() => install(app.id)} disabled={isPending}>
                      Add
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
