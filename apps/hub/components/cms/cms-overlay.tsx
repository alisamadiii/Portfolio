"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
import { ChevronRight, Database, X } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

import { isConfigEnabled } from "@workspace/cms-core/config";
import { getCollectionLeaves } from "@/lib/repo-nav";

import { Collection } from "@/components/collection/collection";
import {
  RepoHeaderProvider,
  useRepoHeaderState,
} from "@/components/repo/repo-header-context";
import { EntrySheet } from "@/components/cms/entry-sheet";
import { CollectionV2 } from "@/components/cms/collection-v2";
import { ArrayCollection } from "@/components/cms/array-collection";
import {
  isArrayCollection,
  type ManifestCollection,
} from "@/lib/engine/collections";
import { isBlogCollection } from "@/lib/engine/blog-schema";

/** Renders the Collection component's captured header (breadcrumb + New entry + search). */
function OverlayToolbar() {
  const { header } = useRepoHeaderState();
  if (!header) return null;
  return (
    <div className="flex h-14 shrink-0 items-center border-b px-4">
      <div className="min-w-0 flex-1">{header}</div>
    </div>
  );
}

/**
 * Framer-style fullscreen CMS overlay above the canvas: collections on the
 * left, entries table in the middle, slide-in edit panel on the right.
 */
export function CmsOverlay({
  open,
  onOpenChange,
  initialCollection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Collection to select when the overlay opens (e.g. from a canvas card). */
  initialCollection?: string;
}) {
  const { config } = useConfig();
  const { myRole } = useRepo();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string | undefined>(undefined);
  // `editing` holds the sheet's identity, `editorOpen` drives the open/close
  // animation — identity is cleared only after the exit animation settles so
  // the sheet can animate out instead of unmounting mid-transition.
  const [editing, setEditing] = useState<{
    schemaName: string;
    path: string;
  } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // CMS v2: collections come from the cms.json manifest instead of the
  // .pages.yml navigation tree; the panel + sheet run schema-less.
  const trpc = useTRPC();
  const manifestQuery = useQuery(
    trpc.cms.manifest.get.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
      },
      {
        enabled: open && Boolean(config?.owner && config?.repo),
        staleTime: 60_000,
      }
    )
  );
  // Blog has its own dedicated manager (/[repo]/blog); it never shows in the
  // generic collections rail.
  const v2Collections: ManifestCollection[] = (
    (manifestQuery.data?.object.collections as ManifestCollection[]) ?? []
  ).filter((collection) => !isBlogCollection(collection));
  const isV2 = Boolean(manifestQuery.data);

  const legacyCollections = useMemo(
    () => getCollectionLeaves(config),
    [config]
  );
  const collections = useMemo(
    () =>
      isV2
        ? v2Collections.map((collection) => ({
            name: collection.name,
            label: collection.label ?? collection.name,
            breadcrumb: [] as string[],
          }))
        : legacyCollections,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isV2, manifestQuery.data, legacyCollections]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((collection) =>
      [collection.label, collection.name, ...collection.breadcrumb]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [collections, search]);

  const active =
    collections.find((collection) => collection.name === selected) ??
    collections[0];
  const activeV2 = isV2
    ? v2Collections.find((collection) => collection.name === active?.name)
    : undefined;

  // Close on Escape — captured so the canvas's own Escape handling never sees it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Let the edit panel / dialogs handle their own Escape first.
      if (editorOpen) return;
      event.stopPropagation();
      onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, editorOpen, onOpenChange]);

  // Fresh folder state per overlay session; honor a requested collection.
  useEffect(() => {
    if (!open) {
      setEditing(null);
      setEditorOpen(false);
      setFolderPath(undefined);
      return;
    }
    if (initialCollection) setSelected(initialCollection);
  }, [open, initialCollection]);

  if (!open || !config) return null;

  const canConfigure = myRole === "full-access" && isConfigEnabled(config.object);

  return (
    <div className="bg-background fixed inset-0 z-40 flex" data-canvas-no-pan>
      {/* Left rail: collections */}
      <div className="flex w-64 shrink-0 flex-col border-r">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close CMS"
            className="-ml-2"
          >
            <X className="size-4" />
          </Button>
          <Database className="text-muted-foreground size-4" />
          <span className="text-sm font-semibold">CMS</span>
        </div>
        <div className="p-3">
          <Input
            placeholder="Search collections…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9"
          />
        </div>
        <nav className="scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {filtered.map((collection) => (
            <button
              key={collection.name}
              type="button"
              onClick={() => {
                setSelected(collection.name);
                setFolderPath(undefined);
                setEditing(null);
                setEditorOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-1 rounded-lg px-3 py-2 text-left text-sm",
                active?.name === collection.name
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/50"
              )}
            >
              {collection.breadcrumb.map((crumb) => (
                <span
                  key={crumb}
                  className="text-muted-foreground flex shrink-0 items-center gap-1"
                >
                  {crumb}
                  <ChevronRight className="size-3" />
                </span>
              ))}
              <span className="truncate">{collection.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-muted-foreground px-3 py-6 text-center text-sm">
              No collections match.
            </div>
          )}
        </nav>
      </div>

      {/* Middle: entries table with the Collection component's own toolbar */}
      <div className="flex min-w-0 flex-1 flex-col">
        {activeV2 ? (
          isArrayCollection(activeV2) ? (
            <ArrayCollection key={activeV2.name} collection={activeV2} />
          ) : (
            <CollectionV2 key={activeV2.name} collection={activeV2} />
          )
        ) : active && !isV2 ? (
          <RepoHeaderProvider>
            <OverlayToolbar />
            <div className="scrollbar flex-1 overflow-y-auto p-4 md:p-6">
              <Collection
                key={`${active.name}:${folderPath ?? ""}`}
                name={active.name}
                path={folderPath}
                onOpenEntry={(path) => {
                  setEditing({ schemaName: active.name, path });
                  setEditorOpen(true);
                }}
                onNavigateFolder={setFolderPath}
              />
            </div>
          </RepoHeaderProvider>
        ) : (
          <Empty className="m-auto max-w-md flex-none border-0">
            <EmptyHeader>
              <EmptyTitle>No collections yet</EmptyTitle>
              <EmptyDescription>
                Define collections in &quot;cms/collections/&quot; and run
                &quot;npx cms-bridge collections&quot;, or add them to
                &quot;.pages.yml&quot; directly.
              </EmptyDescription>
            </EmptyHeader>
            {canConfigure && (
              <EmptyContent>
                <Button
                  variant="default"
                  render={
                    <Link href={`/${config.repo}/configuration`}>
                      Open configuration
                    </Link>
                  }
                />
              </EmptyContent>
            )}
          </Empty>
        )}
      </div>

      {/* Right: slide-in entry editor. Stays mounted through the exit
          animation — identity clears in onOpenChangeComplete. */}
      {editing && (
        <EntrySheet
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onOpenChangeComplete={(next) => {
            if (!next) setEditing(null);
          }}
          schemaName={editing.schemaName}
          mode={{ kind: "edit", path: editing.path }}
        />
      )}
    </div>
  );
}
