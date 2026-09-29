"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  House,
} from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";

import {
  useCanvasEditor,
  type CanvasPageInfo,
  type SitemapPageInfo,
} from "@/components/canvas/canvas-editor-context";

/** Children shown inline under an expanded parent before "See all…". */
const INLINE_CHILD_LIMIT = 10;

/**
 * Left sidebar: the site's pages as a flat list (Framer-style). Deep routes
 * sharing a prefix collapse under a virtual folder; sitemap-discovered pages
 * nest under their parent page. Selecting a page loads that page's iframe.
 */
export function PageTree() {
  const {
    pages,
    entryPages,
    sitemapPaths,
    sitemapLoaded,
    selectedPath,
    setSelectedPath,
    pagesLoading,
  } = useCanvasEditor();

  // Sitemap children grouped by their parent page path (null = no parent —
  // rendered in the "More pages" group at the bottom).
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, SitemapPageInfo[]>();
    for (const page of entryPages) {
      const list = map.get(page.parentPath) ?? [];
      list.push(page);
      map.set(page.parentPath, list);
    }
    return map;
  }, [entryPages]);

  // Which parents (or "__more__") are expanded, and which group's full list
  // is open in the "See all" dialog.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogGroup, setDialogGroup] = useState<string | null>(null);
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pageRows = useMemo(
    () => pages.filter((page) => page.kind !== "collection"),
    [pages]
  );

  // Two sidebar sections: pages search engines are told about (in the
  // deployed sitemap) and pages that aren't (404, noindexed, unbuilt). Only
  // split when a sitemap was actually read — no sitemap → single plain list.
  const splitBySitemap = sitemapLoaded && sitemapPaths.length > 0;
  const inSitemap = useMemo(() => new Set(sitemapPaths), [sitemapPaths]);
  const visibleRows = splitBySitemap
    ? pageRows.filter((page) => inSitemap.has(page.path))
    : pageRows;
  const hiddenRows = splitBySitemap
    ? pageRows.filter((page) => !inSitemap.has(page.path))
    : [];

  // Group deep routes under a virtual folder by their parent prefix, e.g.
  // /services/swimming + /services/soccer-team collapse under a "/services"
  // folder — even when no bare /services page exists. Only groups when 2+
  // pages share the prefix and the prefix isn't itself a page (a lone deep
  // page, or a real parent page, stays inline).
  const virtualGroups = useMemo(() => {
    const parentPrefix = (path: string) => {
      const segments = path.split("/").filter(Boolean);
      return segments.length < 2
        ? null
        : "/" + segments.slice(0, -1).join("/");
    };
    const realPage = new Set(pageRows.map((page) => page.path));
    const map = new Map<string, CanvasPageInfo[]>();
    for (const page of visibleRows) {
      const prefix = parentPrefix(page.path);
      if (prefix && !realPage.has(prefix)) {
        const list = map.get(prefix) ?? [];
        list.push(page);
        map.set(prefix, list);
      }
    }
    for (const [prefix, group] of map) {
      if (group.length < 2) map.delete(prefix);
    }
    return map;
  }, [visibleRows, pageRows]);
  const groupedPaths = useMemo(
    () => new Set([...virtualGroups.values()].flat().map((page) => page.path)),
    [virtualGroups]
  );
  const topRows = useMemo(
    () => visibleRows.filter((page) => !groupedPaths.has(page.path)),
    [visibleRows, groupedPaths]
  );

  // Sitemap-discovered pages with no parent page (the old flat "More pages"
  // bucket) get the same treatment: deep routes sharing a prefix collapse
  // under a folder, the rest fall back to a "More pages" group.
  const parentlessGroups = useMemo<
    Array<[string, SitemapPageInfo[]]>
  >(() => {
    const nulls = childrenByParent.get(null) ?? [];
    const prefixOf = (path: string) => {
      const segments = path.split("/").filter(Boolean);
      return segments.length < 2
        ? null
        : "/" + segments.slice(0, -1).join("/");
    };
    const counts = new Map<string, number>();
    for (const page of nulls) {
      const prefix = prefixOf(page.path);
      if (prefix) counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
    const byPrefix = new Map<string, SitemapPageInfo[]>();
    const rest: SitemapPageInfo[] = [];
    for (const page of nulls) {
      const prefix = prefixOf(page.path);
      if (prefix && (counts.get(prefix) ?? 0) >= 2) {
        const list = byPrefix.get(prefix) ?? [];
        list.push(page);
        byPrefix.set(prefix, list);
      } else {
        rest.push(page);
      }
    }
    const groups: Array<[string, SitemapPageInfo[]]> = [...byPrefix.entries()];
    if (rest.length) groups.push(["__more__", rest]);
    return groups;
  }, [childrenByParent]);
  const groupLookup = useMemo(() => {
    const map = new Map<string, SitemapPageInfo[]>();
    for (const [key, pagesInGroup] of parentlessGroups) map.set(key, pagesInGroup);
    return map;
  }, [parentlessGroups]);

  // One page row (icon, label, expand arrow, nested sitemap children) —
  // shared by both sidebar sections.
  const renderPageRow = (page: CanvasPageInfo) => {
          const children = childrenByParent.get(page.path) ?? [];
          const isExpanded = expanded.has(page.path);
          const active = selectedPath === page.path;
          return (
            <div key={page.path}>
              <div
                className={cn(
                  "flex h-7 w-full items-center rounded-md transition-colors",
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedPath(page.path)}
                  className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-[12.5px]"
                >
                  {page.path === "/" ? (
                    <House className="size-4 shrink-0 opacity-60" />
                  ) : (
                    <FileText className="size-4 shrink-0 opacity-60" />
                  )}
                  <span className="flex-1 truncate">
                    {page.path === "/" ? "Home" : page.path}
                  </span>
                </button>
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(page.path)}
                    aria-label={
                      isExpanded
                        ? "Hide pages under this route"
                        : "Show pages under this route"
                    }
                    className="hover:text-foreground flex h-full items-center px-1.5 opacity-60 hover:opacity-100"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
              {isExpanded && (
                <EntryPageList
                  pages={children}
                  selectedPath={selectedPath}
                  onSelect={setSelectedPath}
                  onSeeAll={() => setDialogGroup(page.path)}
                />
              )}
            </div>
          );
  };

  return (
    <nav className="flex h-full flex-col overflow-y-auto p-2">
      <p className="text-muted-foreground px-2 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.09em]">
        Pages
      </p>
      {pagesLoading && pageRows.length === 0 ? (
        <p className="text-muted-foreground px-2 py-1 text-sm">Loading…</p>
      ) : null}

      <div className="flex flex-col gap-px">
        {topRows.map(renderPageRow)}

        {[...virtualGroups.entries()].map(([prefix, children]) => {
          const isOpen = expanded.has(prefix);
          return (
            <div key={prefix}>
              <button
                type="button"
                onClick={() => toggleExpanded(prefix)}
                className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 opacity-60" />
                )}
                <span className="flex-1 truncate">{prefix}</span>
                <span className="text-muted-foreground ml-auto text-[10.5px] tabular-nums">
                  {children.length}
                </span>
              </button>
              {isOpen && (
                <div className="border-border/60 ml-3.5 border-l pl-1.5">
                  {children.map(renderPageRow)}
                </div>
              )}
            </div>
          );
        })}

        {parentlessGroups.map(([prefix, children]) => {
          const key = `entry:${prefix}`;
          const isOpen = expanded.has(key);
          const label = prefix === "__more__" ? "More pages" : prefix;
          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => toggleExpanded(key)}
                className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 opacity-60" />
                )}
                <span className="flex-1 truncate">{label}</span>
                <span className="text-muted-foreground ml-auto text-[10.5px] tabular-nums">
                  {children.length}
                </span>
              </button>
              {isOpen && (
                <EntryPageList
                  pages={children}
                  selectedPath={selectedPath}
                  onSelect={setSelectedPath}
                  onSeeAll={() => setDialogGroup(prefix)}
                />
              )}
            </div>
          );
        })}
      </div>

      {hiddenRows.length > 0 && (
        <>
          <p
            className="text-muted-foreground px-2 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-[0.09em]"
            title="These pages aren't listed in your sitemap, so search engines like Google won't find them on their own."
          >
            Hidden from Google
          </p>
          <div className="flex flex-col gap-px">
            {hiddenRows.map(renderPageRow)}
          </div>
        </>
      )}

      <SeeAllDialog
        group={dialogGroup}
        pages={
          dialogGroup === null
            ? []
            : (groupLookup.get(dialogGroup) ??
              childrenByParent.get(dialogGroup) ??
              [])
        }
        selectedPath={selectedPath}
        onSelect={(path) => {
          setSelectedPath(path);
          setDialogGroup(null);
        }}
        onClose={() => setDialogGroup(null)}
      />

      <p className="text-muted-foreground mt-auto border-t px-2 pb-1 pt-2.5 text-[11px] leading-relaxed">
        Pick a page to preview it, then ask the AI to change anything on it.
      </p>
    </nav>
  );
}

/** Indented sitemap-page rows: first 10 inline, then a "See all N…" opener. */
function EntryPageList({
  pages,
  selectedPath,
  onSelect,
  onSeeAll,
}: {
  pages: SitemapPageInfo[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <div className="flex flex-col gap-px">
      {pages.slice(0, INLINE_CHILD_LIMIT).map((page) => (
        <button
          key={page.path}
          type="button"
          onClick={() => onSelect(page.path)}
          className={cn(
            "flex h-7 w-full items-center gap-2 rounded-md pl-8 pr-2 text-left text-[12.5px] transition-colors",
            selectedPath === page.path
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <FileText className="size-4 shrink-0 opacity-60" />
          <span className="truncate">{page.title}</span>
        </button>
      ))}
      {pages.length > INLINE_CHILD_LIMIT && (
        <button
          type="button"
          onClick={onSeeAll}
          className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-7 w-full items-center rounded-md pl-8 pr-2 text-left text-[12px] transition-colors"
        >
          See all {pages.length} pages…
        </button>
      )}
    </div>
  );
}

/** Full list of a group's pages, searchable — for hundreds of posts. */
function SeeAllDialog({
  group,
  pages,
  selectedPath,
  onSelect,
  onClose,
}: {
  group: string | null;
  pages: SitemapPageInfo[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? pages.filter((page) =>
        page.path.toLowerCase().includes(query.trim().toLowerCase())
      )
    : pages;
  return (
    <Dialog
      open={group !== null}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {group === "__more__" ? "More pages" : `Pages under ${group}`}
          </DialogTitle>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages…"
          autoFocus
        />
        <div className="-mx-2 max-h-[50vh] overflow-y-auto px-2">
          <div className="flex flex-col gap-px">
            {filtered.map((page) => (
              <button
                key={page.path}
                type="button"
                onClick={() => onSelect(page.path)}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
                  selectedPath === page.path
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <FileText className="size-4 shrink-0 opacity-60" />
                <span className="truncate">{page.path}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground px-2 py-3 text-sm">
                No pages match.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
