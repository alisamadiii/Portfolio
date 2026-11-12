"use client";

import { Inbox, PencilLine } from "lucide-react";

import { useAgency } from "@/components/agency/use-agency";
import { StatusText } from "@/components/ds/ui/badge";
import { Card } from "@/components/ds/ui/card";
import { IconTile } from "@/components/ds/ui/misc";

/** Where leads come from and whether each source is on. Booking and calls live in GoHighLevel now. */
export function LeadSources({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { canInstall } = useAgency();
  const sources = [
    {
      key: "forms",
      icon: Inbox,
      title: "Website forms",
      on: canInstall,
      text: canInstall
        ? "Every form on your site that carries the capture script lands here with where the visitor came from."
        : "Add the capture script to your site so form submissions land here.",
      action: canInstall ? undefined : (
        <button type="button" onClick={onOpenSettings} className="text-[13px] font-medium text-coral-text">
          Install the snippet
        </button>
      ),
    },
    {
      key: "manual",
      icon: PencilLine,
      title: "Added by hand",
      on: true,
      text: "Phone calls and walk-ins you log with the Add lead button.",
    },
  ];
  return (
    <Card>
      {sources.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex flex-wrap items-center gap-4 border-b border-divider px-6 py-5 last:border-b-0">
            <IconTile tone={s.on ? "coral" : "neutral"}>
              <Icon className="size-5" strokeWidth={1.8} />
            </IconTile>
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">{s.title}</span>
                <StatusText tone={s.on ? "success" : "neutral"}>{s.on ? "Connected" : "Not set up"}</StatusText>
              </div>
              <p className="text-[13px] leading-normal text-dim">{s.text}</p>
            </div>
            {s.action}
          </div>
        );
      })}
    </Card>
  );
}
