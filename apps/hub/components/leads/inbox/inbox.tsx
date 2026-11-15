"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";

import { cn } from "@workspace/ui/lib/utils";

import { InboxList } from "./inbox-list";
import { InboxThread } from "./inbox-thread";
import { LeadPanel } from "./lead-panel";

export const INBOX_TABS = ["unread", "all", "starred"] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

const PANEL_KEY = "hub-inbox-details";
const WIDE = "(min-width: 1280px)";

/** Whether the details panel can dock (xl and up). */
const useWide = () =>
  useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE).matches,
    () => true
  );

/**
 * Leads as conversations: the list on the left, the open lead's thread in
 * the middle (texts when they have a phone, email otherwise) and their
 * details on the right. Below xl the details slide over the thread; on
 * phones one pane shows at a time.
 */
export function LeadsInbox() {
  const [leadId, setLeadId] = useQueryState("lead", parseAsInteger);
  const [tab, setTab] = useQueryState("inbox", parseAsStringLiteral(INBOX_TABS).withDefault("all"));
  // Docked panel on wide screens (remembered); overlay below xl (never remembered).
  const [docked, setDocked] = useState(true);
  const [overlay, setOverlay] = useState(false);
  const wide = useWide();

  useEffect(() => {
    try {
      if (localStorage.getItem(PANEL_KEY) === "closed") setDocked(false);
    } catch {
      // storage blocked: panel stays open
    }
  }, []);

  const togglePanel = () => {
    if (!wide) {
      setOverlay((open) => !open);
      return;
    }
    setDocked((open) => {
      try {
        localStorage.setItem(PANEL_KEY, open ? "closed" : "open");
      } catch {
        // storage blocked: the toggle still works for this visit
      }
      return !open;
    });
  };

  const select = (id: number | null) => {
    setOverlay(false);
    void setLeadId(id);
  };

  return (
    <div
      className={cn(
        "relative grid min-h-0 flex-1 overflow-hidden bg-surface",
        "lg:grid-cols-[300px_minmax(0,1fr)]",
        leadId && docked && "xl:grid-cols-[300px_minmax(0,1fr)_320px]"
      )}
    >
      <div className={cn("min-h-0 border-line lg:border-r", leadId ? "hidden lg:flex" : "flex")}>
        <InboxList tab={tab} onTab={(t) => void setTab(t)} selected={leadId} onSelect={select} />
      </div>
      {leadId ? (
        <>
          <div className="flex min-h-0 min-w-0">
            <InboxThread
              key={leadId}
              leadId={leadId}
              panelOpen={wide ? docked : overlay}
              onTogglePanel={togglePanel}
              onBack={() => select(null)}
            />
          </div>
          {(docked || overlay) && (
            <div
              className={cn(
                "min-h-0 border-l border-line bg-surface",
                overlay ? "absolute inset-y-0 right-0 z-10 flex w-full max-w-[340px]" : "hidden",
                docked && "xl:static xl:flex xl:w-auto xl:max-w-none"
              )}
            >
              <LeadPanel leadId={leadId} onClose={togglePanel} />
            </div>
          )}
        </>
      ) : (
        <div className="hidden items-center justify-center p-8 text-center text-[13px] text-dim lg:flex">
          Pick a lead to see the conversation.
        </div>
      )}
    </div>
  );
}
