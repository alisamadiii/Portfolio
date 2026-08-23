"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { REGION_COLORS } from "@alisamadiillc/cms-bridge";

import { ProjectBillingPanel } from "@/components/billing/project-billing";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { useSeoDraft } from "@/components/settings/use-seo-draft";
import { BlogPanel } from "@/components/settings/blog-panel";
import { DomainsPanel } from "@/components/settings/domains-panel";
import { EmailsPanel } from "@/components/settings/emails-panel";
import { EnvelopeMark } from "@/components/emails/envelope-mark";
import { GeneralSettingsPanel } from "@/components/settings/general-settings-panel";
import { VariablesPanel } from "@/components/settings/variables-panel";
import { PageSettingsPanel } from "@/components/settings/page-settings-panel";

/** Sentinels for the Site Settings entries in the settings nav. */
const GENERAL = "$general";
const VARIABLES = "$variables";
const BILLING = "$billing";
const DOMAIN = "$domain";
const BLOG = "$blog";
const EMAILS = "$emails";

/**
 * In-shell Settings view (the logo-dropdown flips into this). Own left nav —
 * Site Settings › General and Page Settings › [pages] — with SEO/site forms on
 * the right. Base-path/advanced config still lives on the standalone route.
 */
export function SettingsMode() {
  const { pages, settingsRequest, setSettingsRequest } = useCanvasEditor();
  const seo = useSeoDraft();
  const [selected, setSelected] = useState<string>(GENERAL);
  // Field to scroll-to + flash in the Variables form (from a variant click).
  const [focusField, setFocusField] = useState<{ field: string; key: number } | null>(
    null
  );
  const focusKey = useRef(0);

  const pageRows = useMemo(
    () => pages.filter((page) => page.kind !== "collection"),
    [pages]
  );

  // A variant click (or any settings request) selects the section and, when a
  // field is named, flashes its input so the user knows what to edit.
  useEffect(() => {
    if (!settingsRequest) return;
    if (settingsRequest.section === "variables") {
      setSelected(VARIABLES);
      if (settingsRequest.field)
        setFocusField({ field: settingsRequest.field, key: ++focusKey.current });
    } else if (settingsRequest.section === "blog") {
      setSelected(BLOG);
    }
    setSettingsRequest(null);
  }, [settingsRequest, setSettingsRequest]);

  const selectedPage =
    selected === GENERAL ||
    selected === VARIABLES ||
    selected === BILLING ||
    selected === DOMAIN ||
    selected === BLOG ||
    selected === EMAILS
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
          icon={
            <Blocks
              className="size-4"
              style={{ color: REGION_COLORS.variant }}
            />
          }
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
          <VariablesPanel
            focusField={focusField?.field}
            focusKey={focusField?.key}
          />
        ) : selected === BILLING ? (
          <ProjectBillingPanel />
        ) : selected === DOMAIN ? (
          <DomainsPanel />
        ) : selected === BLOG ? (
          <BlogPanel />
        ) : selected === EMAILS ? (
          <EmailsPanel />
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
