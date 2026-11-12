import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";

import type { AppDef, AppState } from "@/lib/apps";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { IconTile } from "../ui/misc";

/**
 * App card (Apps page grid: repeat(auto-fill, minmax(260px,1fr)), gap 12).
 * installed → "Installed" badge + Open + menu slot ; included → coral "Add to site" ;
 * locked → lock + the locked action (dark "Upgrade to add" or "Ask us to add").
 */
export function AppCard({
  app,
  state,
  href,
  onAdd,
  adding,
  lockedAction,
  menu,
}: {
  app: AppDef;
  state: AppState;
  href: string;
  onAdd?: () => void;
  adding?: boolean;
  /** Rendered in place of the Add button when locked. */
  lockedAction?: ReactNode;
  /** Rendered next to "Open" when installed (the ··· menu). */
  menu?: ReactNode;
}) {
  const Icon = app.icon;
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-[18px] hover:border-line-hover">
      <div className="flex items-center justify-between">
        <IconTile tone={state === "locked" ? "neutral" : "coral"}>
          <Icon className="size-5" strokeWidth={1.8} />
        </IconTile>
        {state === "installed" && (
          <Badge tone="success" icon={<Check className="size-3" strokeWidth={2.6} />}>
            Installed
          </Badge>
        )}
        {state === "included" && <span className="text-xs text-dim">Included</span>}
        {state === "locked" && (
          <span className="inline-flex items-center gap-1 text-xs text-dim">
            <Lock className="size-3" />
            Not in your plan
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{app.name}</span>
        <p className="text-[13px] leading-normal text-dim">{app.description}</p>
      </div>
      <div className="mt-auto flex gap-2">
        {state === "installed" && (
          <>
            <Link
              href={href}
              className="flex h-8 flex-1 items-center justify-center rounded-control bg-subtle text-[13px] font-medium text-ink hover:bg-hover"
            >
              Open
            </Link>
            {menu}
          </>
        )}
        {state === "included" && (
          <Button variant="primary" size="sm" className="flex-1" onClick={onAdd} disabled={adding}>
            Add to site
          </Button>
        )}
        {state === "locked" && lockedAction}
      </div>
    </div>
  );
}
