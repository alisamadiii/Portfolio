"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { Database, FileText, House } from "lucide-react";

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
    <nav className="flex h-full flex-col gap-0.5 overflow-y-auto p-2">
      <p className="text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wide">
        Pages
      </p>
      {pagesLoading && pageRows.length === 0 ? (
        <p className="text-muted-foreground px-2 py-1 text-sm">Loading…</p>
      ) : null}

      {pageRows.map((page) => {
        const nested = collectionsFor(page);
        const active = selectedPath === page.path;
        return (
          <div key={page.path}>
            <button
              type="button"
              onClick={() => setSelectedPath(page.path)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {page.path === "/" ? (
                <House className="size-4 shrink-0" />
              ) : (
                <FileText className="size-4 shrink-0" />
              )}
              <span className="truncate">
                {page.path === "/" ? "Home" : page.path}
              </span>
            </button>
            {nested.map((collection) => (
              <CollectionRow
                key={collection.path}
                label={collection.title}
                count={countByName.get(collection.collection ?? "")}
                onClick={() =>
                  setCmsOverlay({ open: true, collection: collection.collection })
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
        "text-muted-foreground hover:bg-muted/60 hover:text-foreground flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors",
        indented ? "pl-8" : "pl-2"
      )}
    >
      <Database className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      {typeof count === "number" && (
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}
