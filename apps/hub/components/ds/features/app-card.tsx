import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Loader2, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

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
  const Logo = app.logo;
  return (
    <div className="rounded-card border-line bg-surface hover:border-line-hover flex flex-col gap-3 border p-[18px]">
      <div className="flex items-center justify-between">
        <IconTile tone={Logo ? "brand" : state === "locked" ? "neutral" : "coral"}>
          {Logo ? (
            <Logo className="size-5" />
          ) : (
            <Icon className="size-5" strokeWidth={1.8} />
          )}
        </IconTile>
        <AnimatePresence mode="popLayout" initial={false}>
          {state === "installed" && (
            <motion.span
              key="installed"
              initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", duration: 0.4, bounce: 0 }}
            >
              <Badge
                tone="success"
                icon={<Check className="size-3" strokeWidth={2.6} />}
              >
                Installed
              </Badge>
            </motion.span>
          )}
          {state === "included" && (
            <motion.span
              key="included"
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.15 }}
              className="text-dim text-xs"
            >
              {adding ? "Adding…" : "Included"}
            </motion.span>
          )}
        </AnimatePresence>
        {state === "locked" && (
          <span className="text-dim inline-flex items-center gap-1 text-xs">
            <Lock className="size-3" />
            Not in your plan
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{app.name}</span>
        <p className="text-dim text-[13px] leading-normal">{app.description}</p>
      </div>
      <div className="mt-auto flex gap-2">
        <AnimatePresence initial={false}>
          {state === "installed" && (
            <motion.div
              key="installed"
              className="flex flex-1 gap-2"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            >
              <Link
                href={href}
                className="rounded-control bg-subtle text-ink hover:bg-hover flex h-8 flex-1 items-center justify-center text-[13px] font-medium"
              >
                Open
              </Link>
              {menu}
            </motion.div>
          )}
        </AnimatePresence>
        {state === "included" && (
          <Button
            variant="primary"
            size="sm"
            className="relative flex-1 overflow-hidden disabled:opacity-100"
            onClick={onAdd}
            disabled={adding}
            aria-busy={adding}
          >
            {adding && (
              <motion.span
                aria-hidden
                className="bg-ink/10 absolute inset-y-0 left-0"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 2, ease: "easeOut" }}
              />
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={adding ? "adding" : "add"}
                className="relative inline-flex items-center gap-1.5"
                initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                transition={{ duration: 0.15 }}
              >
                {adding && <Loader2 className="size-3.5 animate-spin" />}
                {adding ? "Adding…" : "Add to site"}
              </motion.span>
            </AnimatePresence>
          </Button>
        )}
        {state === "locked" && lockedAction}
      </div>
    </div>
  );
}
