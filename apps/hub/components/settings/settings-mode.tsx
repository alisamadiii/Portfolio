"use client";

import { useState } from "react";
import { CreditCard, Globe, TriangleAlert } from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";

import { ProjectBillingPanel } from "@/components/billing/project-billing";
import { AnalyticsPanel } from "@/components/settings/analytics-panel";
import { DangerPanel } from "@/components/settings/danger-panel";
import { ChartMark } from "@/components/analytics/chart-mark";
import { SpeedMark } from "@/components/analytics/speed-mark";
import { SpeedPanel } from "@/components/settings/speed-panel";
import { DomainPanel } from "@/components/settings/domain-panel";
import { EmailsPanel } from "@/components/settings/emails-panel";
import { EnvelopeMark } from "@/components/emails/envelope-mark";

/** Sentinels for the Site Settings entries in the settings nav. */
const BILLING = "$billing";
const DOMAIN = "$domain";
const EMAILS = "$emails";
const ANALYTICS = "$analytics";
const SPEED = "$speed";
const DANGER = "$danger";

/**
 * In-shell Settings view (the logo-dropdown flips into this). Repo-level
 * project settings only — Billing, Domain, Emails, Analytics, Speed, Danger.
 * Site content + page settings are edited through the AI chat now.
 */
export function SettingsMode() {
  const [selected, setSelected] = useState<string>(BILLING);

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
          icon={<Globe className="size-4" />}
          label="Domain"
          active={selected === DOMAIN}
          onClick={() => setSelected(DOMAIN)}
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
      </aside>

      {/* Content */}
      <main className="bg-shell min-w-0 flex-1 overflow-y-auto">
        {selected === BILLING ? (
          <ProjectBillingPanel />
        ) : selected === DOMAIN ? (
          <DomainPanel />
        ) : selected === EMAILS ? (
          <EmailsPanel />
        ) : selected === ANALYTICS ? (
          <AnalyticsPanel />
        ) : selected === SPEED ? (
          <SpeedPanel />
        ) : selected === DANGER ? (
          <DangerPanel />
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
