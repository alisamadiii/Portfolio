"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { Database, FileText, House } from "@/components/icon";

import { cn } from "@workspace/ui/lib/utils";

import {
  useCanvasEditor,
  type CanvasPageInfo,
} from "@/components/canvas/canvas-editor-context";

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
    selectedPath,
    setSelectedPath,
    setCmsOverlay,
    pagesLoading,
    dirtyPagePaths,
  } = useCanvasEditor();
  const trpc = useTRPC();

  const pageRows = useMemo(
    () => pages.filter((page) => page.kind !== "collection"),
    [pages]
  );
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

  return (
    <nav className="flex h-full flex-col overflow-y-auto p-2">
      <p className="text-muted-foreground px-2 pb-1.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.09em]">
        Pages
      </p>
      {pagesLoading && pageRows.length === 0 ? (
        <p className="text-muted-foreground px-2 py-1 text-sm">Loading…</p>
      ) : null}

      <div className="flex flex-col gap-px">
        {pageRows.map((page) => {
          const nested = collectionsFor(page);
          const active = selectedPath === page.path;
          const dirty = dirtyPagePaths.has(page.path);
          return (
            <div key={page.path}>
              <button
                type="button"
                onClick={() => setSelectedPath(page.path)}
                className={cn(
                  "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px] transition-colors",
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
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
              {nested.map((collection) => (
                <CollectionRow
                  key={collection.path}
                  label={collection.title}
                  count={countByName.get(collection.collection ?? "")}
                  onClick={() =>
                    setCmsOverlay({
                      open: true,
                      collection: collection.collection,
                    })
                  }
                  indented
                />
              ))}
            </div>
          );
        })}

        {orphanCollections.map((collection) => (
          <CollectionRow
            key={collection.path}
            label={collection.title}
            count={countByName.get(collection.collection ?? "")}
            onClick={() =>
              setCmsOverlay({ open: true, collection: collection.collection })
            }
          />
        ))}
      </div>

      <p className="text-muted-foreground mt-auto border-t px-2 pb-1 pt-2.5 text-[11px] leading-relaxed">
        Click anything in the preview to edit it. Drafts stay on this device
        until you publish.
      </p>
    </nav>
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
