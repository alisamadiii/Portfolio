"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import {
  ChevronDown,
  ChevronRight,
  Database,
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
import { isBlogCollection } from "@/lib/engine/blog-schema";

/** Children shown inline under an expanded parent before "See all…". */
const INLINE_CHILD_LIMIT = 10;

/**
 * Left sidebar: the site's pages as a flat list (Framer-style). A page that
 * owns a CMS collection shows the collection as an indented sub-row with a
 * live entry-count badge; selecting it opens the CMS overlay. Selecting a
 * page loads that page's iframe.
 */
export function PageTree() {
  const {
    owner,
    repo,
    branch,
    pages,
    entryPages,
    sitemapPaths,
    sitemapLoaded,
    selectedPath,
    setSelectedPath,
    setCmsOverlay,
    setSettingsRequest,
    pagesLoading,
    dirtyPagePaths,
  } = useCanvasEditor();
  const trpc = useTRPC();

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

  // Blog is managed on its own Settings page, not the generic CMS overlay.
  const openCollection = (name?: string) => {
    if (isBlogCollection({ name: name ?? "" })) {
      setSettingsRequest({ section: "blog" });
    } else {
      setCmsOverlay({ open: true, collection: name });
    }
  };

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
  const collections = useMemo(
    () => pages.filter((page) => page.kind === "collection"),
    [pages]
  );

  // One entry-count query per collection (light — a single dir listing).
  const countQueries = useQueries({
    queries: collections.map((collection) =>
      trpc.cms.collections.listV2.queryOptions(
        { owner, repo, branch, name: collection.collection ?? "" },
        {
          enabled: Boolean(owner && repo && branch && collection.collection),
          staleTime: 60_000,
        }
      )
    ),
  });
  const countByName = useMemo(() => {
    const map = new Map<string, number>();
    collections.forEach((collection, index) => {
      const data = countQueries[index]?.data;
      if (data && collection.collection)
        map.set(collection.collection, data.entries.length);
    });
    return map;
  }, [collections, countQueries]);

  const collectionsFor = (page: CanvasPageInfo) =>
    collections.filter((collection) => collection.parentPath === page.path);
  const orphanCollections = collections.filter(
    (collection) =>
      !pageRows.some((page) => page.path === collection.parentPath)
  );

  // One page row (icon, label, dirty dot, expand arrow, nested collection
  // rows) — shared by both sidebar sections.
  const renderPageRow = (page: CanvasPageInfo) => {
          const nested = collectionsFor(page);
          const children = childrenByParent.get(page.path) ?? [];
          const isExpanded = expanded.has(page.path);
          const active = selectedPath === page.path;
          const dirty = dirtyPagePaths.has(page.path);
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
                  {dirty && (
                    <span
                      className="bg-draft size-[5px] shrink-0 rounded-full"
                      title="Unpublished changes"
                    />
                  )}
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
              {nested.map((collection) => (
                <CollectionRow
                  key={collection.path}
                  label={collection.title}
                  count={countByName.get(collection.collection ?? "")}
                  onClick={() => openCollection(collection.collection)}
                  indented
                />
              ))}
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
        {visibleRows.map(renderPageRow)}

        {orphanCollections.map((collection) => (
          <CollectionRow
            key={collection.path}
            label={collection.title}
            count={countByName.get(collection.collection ?? "")}
            onClick={() => openCollection(collection.collection)}
          />
        ))}

        {(childrenByParent.get(null) ?? []).length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => toggleExpanded("__more__")}
              className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] transition-colors"
            >
              {expanded.has("__more__") ? (
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 opacity-60" />
              )}
              <span className="flex-1 truncate">More pages</span>
              <span className="text-muted-foreground ml-auto text-[10.5px] tabular-nums">
                {(childrenByParent.get(null) ?? []).length}
              </span>
            </button>
            {expanded.has("__more__") && (
              <EntryPageList
                pages={childrenByParent.get(null) ?? []}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                onSeeAll={() => setDialogGroup("__more__")}
              />
            )}
          </div>
        )}
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
            : (childrenByParent.get(
                dialogGroup === "__more__" ? null : dialogGroup
              ) ?? [])
        }
        selectedPath={selectedPath}
        onSelect={(path) => {
          setSelectedPath(path);
          setDialogGroup(null);
        }}
        onClose={() => setDialogGroup(null)}
      />

      <p className="text-muted-foreground mt-auto border-t px-2 pb-1 pt-2.5 text-[11px] leading-relaxed">
        Click anything in the preview to edit it. Drafts stay on this device
        until you publish.
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

function CollectionRow({
  label,
  count,
  onClick,
  indented,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  indented?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-7 w-full items-center gap-2 rounded-md pr-2 text-left text-[12.5px] transition-colors",
        indented ? "pl-8" : "pl-2"
      )}
    >
      <Database className="size-4 shrink-0 opacity-60" />
      <span className="truncate">{label}</span>
      {typeof count === "number" && (
        <span className="text-muted-foreground ml-auto text-[10.5px] tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
