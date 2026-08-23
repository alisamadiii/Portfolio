"use client";

import { useMemo, useState } from "react";
import {
  Blocks,
  CreditCard,
  FileText,
  Globe,
  House,
  Newspaper,
  SlidersHorizontal,
} from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";

import { ProjectBillingPanel } from "@/components/billing/project-billing";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { useSeoDraft } from "@/components/settings/use-seo-draft";
import { BlogPanel } from "@/components/settings/blog-panel";
import { DomainsPanel } from "@/components/settings/domains-panel";
import { GeneralSettingsPanel } from "@/components/settings/general-settings-panel";
import { VariablesPanel } from "@/components/settings/variables-panel";
import { PageSettingsPanel } from "@/components/settings/page-settings-panel";

/** Sentinels for the Site Settings entries in the settings nav. */
const GENERAL = "$general";
const VARIABLES = "$variables";
const BILLING = "$billing";
const DOMAIN = "$domain";
const BLOG = "$blog";

/**
 * In-shell Settings view (the logo-dropdown flips into this). Own left nav —
 * Site Settings › General and Page Settings › [pages] — with SEO/site forms on
 * the right. Base-path/advanced config still lives on the standalone route.
 */
export function SettingsMode() {
  const { pages } = useCanvasEditor();
  const seo = useSeoDraft();
  const [selected, setSelected] = useState<string>(GENERAL);

  const pageRows = useMemo(
    () => pages.filter((page) => page.kind !== "collection"),
    [pages]
  );

  const selectedPage =
    selected === GENERAL ||
    selected === VARIABLES ||
    selected === BILLING ||
    selected === DOMAIN ||
    selected === BLOG
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
          icon={<SlidersHorizontal className="size-4" />}
          label="General"
          active={selected === GENERAL}
          onClick={() => setSelected(GENERAL)}
        />
        <NavRow
          icon={<Blocks className="size-4" />}
          label="Variables"
          active={selected === VARIABLES}
          onClick={() => setSelected(VARIABLES)}
        />
        <NavRow
          icon={<CreditCard className="size-4" />}
          label="Billing"
          active={selected === BILLING}
          onClick={() => setSelected(BILLING)}
        />
        <NavRow
          icon={<Globe className="size-4" />}
          label="Domain"
          active={selected === DOMAIN}
          onClick={() => setSelected(DOMAIN)}
        />
        <NavRow
          icon={<Newspaper className="size-4" />}
          label="Blog"
          active={selected === BLOG}
          onClick={() => setSelected(BLOG)}
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
        {selectedPage ? (
          <PageSettingsPanel page={selectedPage} seo={seo} />
        ) : selected === VARIABLES ? (
          <VariablesPanel />
        ) : selected === BILLING ? (
          <ProjectBillingPanel />
        ) : selected === DOMAIN ? (
          <DomainsPanel />
        ) : selected === BLOG ? (
          <BlogPanel />
        ) : (
          <GeneralSettingsPanel seo={seo} />
        )}
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
