"use client";

import { useDeferredValue, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { Image as ImageIcon, Inbox, Search, Star } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import { formatPhone, toE164 } from "@workspace/trpc/lib/inbox-shared";
import { cn } from "@workspace/ui/lib/utils";

import { useAgency } from "@/components/agency/use-agency";
import { Button } from "@/components/ds/ui/button";
import { EmptyState } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

import type { InboxTab } from "./inbox";

const PAGE = 50;

/** A lead's display name: name, else email, else phone. */
export const leadName = (lead: { id: number; name: string | null; email: string | null; phone: string | null }) =>
  lead.name?.trim() || lead.email || (lead.phone && formatPhone(toE164(lead.phone) ?? lead.phone)) || `Lead #${lead.id}`;

export const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export function InboxList({
  tab,
  onTab,
  selected,
  onSelect,
}: {
  tab: InboxTab;
  onTab: (tab: InboxTab) => void;
  selected: number | null;
  onSelect: (id: number) => void;
}) {
  const trpc = useTRPC();
  const { projectId } = useAgency();
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const [limit, setLimit] = useState(PAGE);

  const list = useQuery(
    trpc.agency.inbox.list.queryOptions(
      { projectId, tab, q: q || undefined, limit },
      { placeholderData: keepPreviousData, refetchInterval: 15_000 }
    )
  );
  const rows = list.data?.rows ?? [];

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="flex flex-col gap-3 border-b border-line p-3">
        <SegmentedTabs
          label="Conversations"
          value={tab}
          onChange={(id) => {
            setLimit(PAGE);
            onTab(id as InboxTab);
          }}
          items={[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread", count: list.data?.unread || undefined },
            { id: "starred", label: "Starred" },
          ]}
        />
        <label className="flex h-9 items-center gap-2 rounded-control bg-subtle px-2.5 text-sm">
          <Search className="size-4 shrink-0 text-faint" />
          <input
            value={search}
            onChange={(e) => {
              setLimit(PAGE);
              setSearch(e.target.value);
            }}
            placeholder="Search name, email or phone"
            aria-label="Search leads"
            className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-faint focus:outline-none"
          />
        </label>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", list.isPlaceholderData && "opacity-60")}>
        {list.isPending ? (
          <div className="px-4 py-10 text-center text-[13px] text-dim">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={tab === "starred" ? <Star className="size-5" /> : <Inbox className="size-5" />}
            title={q ? "No matches" : tab === "unread" ? "All caught up" : tab === "starred" ? "Nothing starred" : "No leads yet"}
            text={
              q
                ? "Try another name, email or phone number."
                : tab === "unread"
                  ? "New replies from leads show up here."
                  : tab === "starred"
                    ? "Star a conversation to keep it here."
                    : "Form submissions, texts and leads you add by hand show up here."
            }
          />
        ) : (
          <ul>
            {rows.map((lead) => {
              const name = leadName(lead);
              const active = lead.id === selected;
              const preview = lead.last
                ? `${lead.last.direction === "out" ? "You: " : ""}${lead.last.body || (lead.last.hasMedia ? "Photo" : "")}`
                : lead.message || "New lead";
              const at = lead.lastMessageAt ?? lead.createdAt;
              return (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(lead.id)}
                    aria-current={active || undefined}
                    className={cn(
                      "flex w-full gap-3 border-b border-divider px-3 py-3 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral",
                      active && "bg-selected hover:bg-selected"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tile text-xs font-semibold text-ink-3">
                      {initials(name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        <span className={cn("min-w-0 flex-1 truncate text-sm text-ink", lead.unread > 0 && "font-semibold")}>
                          {name}
                        </span>
                        <span className="shrink-0 text-xs text-faint">
                          {formatDistanceToNowStrict(new Date(at), { addSuffix: false })}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-1 truncate text-[13px]",
                            lead.unread > 0 ? "text-ink" : "text-dim"
                          )}
                        >
                          {lead.last?.hasMedia && !lead.last.body && <ImageIcon className="size-3.5 shrink-0" />}
                          <span className="truncate">{preview}</span>
                        </span>
                        {lead.starred && <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="Starred" />}
                        {lead.unread > 0 && (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-coral px-1 text-[11px] font-semibold text-ink">
                            {lead.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {list.data && list.data.total > rows.length && (
          <div className="p-3">
            <Button size="sm" className="w-full" onClick={() => setLimit((n) => n + PAGE)}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
