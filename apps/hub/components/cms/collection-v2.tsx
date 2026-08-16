"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

import { useTRPC } from "@workspace/trpc/client";
import { useConfig } from "@/contexts/config-context";
import { useDrafts } from "@/lib/store/drafts";
import {
  collectionSchema,
  entryMetaFromFilename,
  type ManifestCollection,
} from "@/lib/engine/collections";

import { EntrySheet, type EntrySheetMode } from "@/components/cms/entry-sheet";

/**
 * CMS v2 collection panel: lists a manifest-declared collection's Markdown
 * entries (plus local new-entry drafts), with search, a New entry button and
 * the shared EntrySheet (synthetic schema from the cms.json declaration).
 */
export function CollectionV2({
  collection,
}: {
  collection: ManifestCollection;
}) {
  const { config } = useConfig();
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [sheetMode, setSheetMode] = useState<EntrySheetMode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";

  const listQuery = useQuery(
    trpc.cms.collections.listV2.queryOptions(
      { owner, repo, branch, name: collection.name },
      { enabled: Boolean(owner && repo && branch), staleTime: 30_000 }
    )
  );

  const drafts = useDrafts(owner, repo, branch);
  const schema = useMemo(() => collectionSchema(collection), [collection]);

  const rows = useMemo(() => {
    const prefix = `${collection.path}/`;
    const draftByPath = new Map(
      drafts
        .filter(([, draft]) => draft.path.startsWith(prefix))
        .map(([key, draft]) => [draft.path, { key, draft }] as const)
    );
    const out: Array<{
      path: string;
      title: string;
      date: string | null;
      isDraft: boolean;
      isNew: boolean;
    }> = [];
    for (const entry of listQuery.data?.entries ?? []) {
      const meta = entryMetaFromFilename(entry.name);
      const draft = draftByPath.get(entry.path);
      out.push({
        path: entry.path,
        title: draft?.draft.title || meta.title,
        date: meta.date,
        isDraft: Boolean(draft),
        isNew: false,
      });
      draftByPath.delete(entry.path);
    }
    // Remaining drafts are new entries not on GitHub yet.
    for (const [path, { draft }] of draftByPath) {
      const meta = entryMetaFromFilename(path.slice(prefix.length));
      out.push({
        path,
        title: draft.title || meta.title,
        date: meta.date,
        isDraft: true,
        isNew: true,
      });
    }
    // Date-prefixed filenames sort newest-first; undated ones go last.
    out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const query = search.trim().toLowerCase();
    return query
      ? out.filter((row) => row.title.toLowerCase().includes(query))
      : out;
  }, [listQuery.data, drafts, collection.path, search]);

  const takenPaths = useMemo(() => {
    const taken = new Set<string>();
    for (const entry of listQuery.data?.entries ?? []) taken.add(entry.path);
    for (const [, draft] of drafts) taken.add(draft.path);
    return taken;
  }, [listQuery.data, drafts]);

  const label = collection.label ?? collection.name;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </span>
        <div className="relative ml-auto w-56">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 pl-8"
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            setSheetMode({ kind: "new", takenPaths });
            setSheetOpen(true);
          }}
        >
          <Plus className="size-4" />
          New entry
        </Button>
      </div>

      <div className="scrollbar flex-1 overflow-y-auto p-4 md:p-6">
        {listQuery.isLoading ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            Loading entries…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No entries yet — create the first one.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {rows.map((row) => (
              <button
                key={row.path}
                type="button"
                onClick={() => {
                  setSheetMode({ kind: "edit", path: row.path });
                  setSheetOpen(true);
                }}
                className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {row.title}
                </span>
                {row.isDraft && (
                  <Badge variant="secondary">
                    {row.isNew ? "New draft" : "Draft"}
                  </Badge>
                )}
                {row.date && (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {row.date}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {sheetMode && (
        <EntrySheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onOpenChangeComplete={(next) => {
            if (!next) setSheetMode(null);
          }}
          schemaName={collection.name}
          mode={sheetMode}
          schemaOverride={schema}
        />
      )}
    </div>
  );
}
