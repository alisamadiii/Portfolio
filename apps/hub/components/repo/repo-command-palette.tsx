"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, TextCursorInput } from "@/components/icon";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

import { useConfig } from "@/contexts/config-context";
import {
  buildFieldSearchIndex,
  filterFieldIndex,
  type FieldSearchItem,
} from "@/lib/config-search";
import {
  flattenNavLeaves,
  getContentNavigation,
  getMediaNavigation,
  type NavLeaf,
} from "@/lib/repo-nav";

type AdminItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

type CommandItem = NavLeaf & { section: string };

export function RepoCommandPalette({
  open,
  onOpenChange,
  adminItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminItems: AdminItem[];
}) {
  const router = useRouter();
  const { config } = useConfig();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Global ⌘K / Ctrl+K hotkey.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  const items = useMemo<CommandItem[]>(() => {
    const content = flattenNavLeaves(getContentNavigation(config), config).map(
      (leaf) => ({ ...leaf, section: "Content" })
    );
    const media = flattenNavLeaves(getMediaNavigation(config), config).map(
      (leaf) => ({ ...leaf, section: "Media" })
    );
    const admin = adminItems.map((item) => ({
      ...item,
      breadcrumb: [] as string[],
      section: "Admin",
    }));
    return [...content, ...media, ...admin];
  }, [config, adminItems]);

  // Field/section index from the config schema — matches deep-link into the
  // entry editor (?focus=fieldPath) instead of just opening a page.
  const fieldIndex = useMemo(
    () => buildFieldSearchIndex(config?.object),
    [config]
  );

  const fieldResults = useMemo<CommandItem[]>(() => {
    if (!config) return [];
    const base = `/${config.repo}`;
    return filterFieldIndex(fieldIndex, query).map(
      (item: FieldSearchItem) => ({
        key: `field-${item.schemaName}-${item.fieldPath}`,
        label: item.label,
        href:
          item.schemaType === "file"
            ? `${base}/file/${encodeURIComponent(item.schemaName)}?focus=${encodeURIComponent(item.fieldPath)}`
            : `${base}/collection/${encodeURIComponent(item.schemaName)}`,
        icon: <TextCursorInput className="size-4" />,
        breadcrumb: item.breadcrumb,
        section: "Fields",
      })
    );
  }, [config, fieldIndex, query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const navMatches = items.filter((item) => {
      const haystack = [item.label, ...item.breadcrumb, item.section]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return [...navMatches, ...fieldResults];
  }, [items, fieldResults, query]);

  // Reset state whenever the palette opens or the query changes.
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const select = (item: CommandItem) => {
    onOpenChange(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[highlight];
      if (item) select(item);
    }
  };

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[15vh] max-w-xl gap-0 self-start p-0"
      >
        <DialogTitle className="sr-only">Search pages</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to any page or collection.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages…"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="text-muted-foreground px-3 py-8 text-center text-sm">
              No pages match “{query}”.
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={`${item.section}-${item.key}`}
                type="button"
                data-index={index}
                onClick={() => select(item)}
                onMouseMove={() => setHighlight(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
                  index === highlight && "bg-muted"
                )}
              >
                <span className="text-muted-foreground shrink-0">
                  {item.icon}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  {item.breadcrumb.map((crumb) => (
                    <span
                      key={crumb}
                      className="text-muted-foreground flex shrink-0 items-center gap-1"
                    >
                      {crumb}
                      <ChevronRight className="size-3" />
                    </span>
                  ))}
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-muted-foreground/70 shrink-0 text-xs">
                  {item.section}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
