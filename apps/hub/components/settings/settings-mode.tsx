"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  FileText,
  House,
  Newspaper,
  TriangleAlert,
} from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";
import { REGION_COLORS } from "@/lib/region-colors";

import { ProjectBillingPanel } from "@/components/billing/project-billing";
import { AnalyticsPanel } from "@/components/settings/analytics-panel";
import { DangerPanel } from "@/components/settings/danger-panel";
import { ChartMark } from "@/components/analytics/chart-mark";
import { SpeedMark } from "@/components/analytics/speed-mark";
import { SpeedPanel } from "@/components/settings/speed-panel";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { useSeoDraft } from "@/components/settings/use-seo-draft";
import { BlogPanel } from "@/components/settings/blog-panel";
import { EmailsPanel } from "@/components/settings/emails-panel";
import { EnvelopeMark } from "@/components/emails/envelope-mark";
import { PageSettingsPanel } from "@/components/settings/page-settings-panel";
import { PanelError } from "@/components/settings/panel-error";

/** Sentinels for the Site Settings entries in the settings nav. */
const BILLING = "$billing";
const BLOG = "$blog";
const EMAILS = "$emails";
const ANALYTICS = "$analytics";
const SPEED = "$speed";
const DANGER = "$danger";

/**
 * In-shell Settings view (the logo-dropdown flips into this). Own left nav —
 * Site Settings › General and Page Settings › [pages] — with SEO/site forms on
 * the right. Base-path/advanced config still lives on the standalone route.
 */
export function SettingsMode() {
  const { pages, settingsRequest, setSettingsRequest, isV2 } =
    useCanvasEditor();
  const seo = useSeoDraft();
  // General / Variables / Page Settings all read the root _site.json. Without it
  // there is no manifest — show an error instead of empty forms. Billing /
  // Blog / Emails are repo-level and stay available.
  const noSite = !isV2;
  const [selected, setSelected] = useState<string>(BILLING);

  const pageRows = useMemo(
    () => pages.filter((page) => page.kind !== "collection"),
    [pages]
  );

  // A variant click (or any settings request) selects the section and, when a
  // field is named, flashes its input so the user knows what to edit.
  useEffect(() => {
    if (!settingsRequest) return;
    if (settingsRequest.section === "blog") {
      setSelected(BLOG);
    }
    setSettingsRequest(null);
  }, [settingsRequest, setSettingsRequest]);

  const selectedPage =
    selected === BILLING ||
    selected === BLOG ||
    selected === EMAILS ||
    selected === ANALYTICS ||
    selected === SPEED ||
    selected === DANGER
      ? null
      : (pageRows.find((page) => page.path === selected) ?? null);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left nav */}
      <aside className="bg-background w-64 shrink-0 overflow-y-auto border-r p-2">
        <p className="text-muted-foreground px-2 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.09em]">
          Site Settings
        </p>
        <NavRow
          icon={<CreditCard className="size-4" />}
          label="Billing"
          active={selected === BILLING}
          onClick={() => setSelected(BILLING)}
        />
        <NavRow
          icon={
            <Newspaper
              className="size-4"
              style={{ color: REGION_COLORS.blog }}
            />
          }
          label="Blog"
          active={selected === BLOG}
          onClick={() => setSelected(BLOG)}
        />
        <NavRow
          icon={<EnvelopeMark className="size-4" />}
          label="Emails"
          active={selected === EMAILS}
          onClick={() => setSelected(EMAILS)}
        />
        <NavRow
          icon={<ChartMark className="size-4" />}
          label="Analytics"
          active={selected === ANALYTICS}
          onClick={() => setSelected(ANALYTICS)}
        />
        <NavRow
          icon={<SpeedMark className="size-4" />}
          label="Speed"
          active={selected === SPEED}
          onClick={() => setSelected(SPEED)}
        />
        <NavRow
          icon={<TriangleAlert className="text-destructive size-4" />}
          label="Danger"
          active={selected === DANGER}
          onClick={() => setSelected(DANGER)}
        />

        <p className="text-muted-foreground mt-3 px-2 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.09em]">
          Page Settings
        </p>
        {pageRows.map((page) => (
          <NavRow
            key={page.path}
            icon={
              page.path === "/" ? (
                <House className="size-4" />
              ) : (
                <FileText className="size-4" />
              )
            }
            label={page.path === "/" ? "Home" : page.path}
            active={selected === page.path}
            onClick={() => setSelected(page.path)}
          />
        ))}
      </aside>

      {/* Content */}
      <main className="bg-shell min-w-0 flex-1 overflow-y-auto">
        {selected === BILLING ? (
          <ProjectBillingPanel />
        ) : selected === BLOG ? (
          <BlogPanel />
        ) : selected === EMAILS ? (
          <EmailsPanel />
        ) : selected === ANALYTICS ? (
          <AnalyticsPanel />
        ) : selected === SPEED ? (
          <SpeedPanel />
        ) : selected === DANGER ? (
          <DangerPanel />
        ) : noSite ? (
          <div className="mx-auto max-w-2xl p-6">
            <PanelError
              title="This project has no _site.json"
              message="Add a _site.json file to the repo root (with cms, seo, and variables) to manage site settings. Site settings are read from that file — there's nothing to configure until it exists."
              onRetry={() => window.location.reload()}
            />
          </div>
        ) : selectedPage ? (
          <PageSettingsPanel page={selectedPage} seo={seo} />
        ) : null}
      </main>
    </div>
  );
}

function NavRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
