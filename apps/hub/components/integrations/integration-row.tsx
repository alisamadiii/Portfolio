import type { ReactNode } from "react";

import { IconTile } from "@/components/ds/ui/misc";

/**
 * One row on the Integrations card: neutral icon tile, name 15/600 + status
 * badge, 13px description, optional meta line, right-aligned action.
 */
export function IntegrationRow({
  icon,
  name,
  badge,
  description,
  meta,
  action,
}: {
  icon: ReactNode;
  name: string;
  badge?: ReactNode;
  description: string;
  meta?: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-divider px-6 py-5 last:border-b-0">
      <IconTile tone="neutral">{icon}</IconTile>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold">{name}</span>
          {badge}
        </div>
        <p className="text-[13px] leading-normal text-dim">{description}</p>
        {meta && <div className="text-xs text-dim">{meta}</div>}
      </div>
      <div className="flex shrink-0 gap-2">{action}</div>
    </div>
  );
}
