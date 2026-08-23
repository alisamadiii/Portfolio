"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

import { useTRPC } from "@workspace/trpc/client";

import {
  collectionSchema,
  entryMetaFromFilename,
  type ManifestCollection,
} from "@/lib/engine/collections";
import { useDrafts } from "@/lib/store/drafts";

import { EntryEditor } from "@/components/cms/entry-editor";
import type { EntrySheetMode } from "@/components/cms/entry-sheet";
import { FileText, Plus, Search } from "@/components/icon";

/**
 * CMS v2 collection panel: lists a manifest-declared collection's Markdown
 * entries (plus local new-entry drafts), with search, a New entry button and
 * a right-side EntryEditor panel (synthetic schema from the cms.json
 * declaration) that keeps the entry list visible while editing.
 */
export function CollectionV2({
  collection,
}: {
  collection: ManifestCollection;
}) {
  const { config } = useConfig();
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EntrySheetMode | null>(null);

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
          onClick={() => setEditing({ kind: "new", takenPaths })}
        >
          <Plus className="size-4" />
          New entry
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="scrollbar min-w-0 flex-1 overflow-y-auto px-5 pb-10">
          {listQuery.isLoading ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Loading entries…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No entries yet — create the first one.
            </p>
          ) : (
            <div>
              <div className="text-muted-foreground bg-card sticky top-0 z-[2] grid grid-cols-[1fr_140px_110px] gap-4 border-b px-2.5 py-2.5 text-[10.5px] font-bold tracking-[0.07em] uppercase">
                <span>Title</span>
                <span>Date</span>
                <span>Status</span>
              </div>
              {rows.map((row) => (
                <button
                  key={row.path}
                  type="button"
                  onClick={() => setEditing({ kind: "edit", path: row.path })}
                  className={`hover:bg-muted/40 grid w-full grid-cols-[1fr_140px_110px] items-center gap-4 border-t px-2.5 py-2.5 text-left transition-colors ${
                    editing?.kind === "edit" && editing.path === row.path
                      ? "bg-muted/60"
                      : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate text-[12.5px] font-semibold">
                      {row.title}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-[12px] tabular-nums">
                    {row.date ?? "—"}
                  </span>
                  <span>
                    {row.isDraft ? (
                      <span className="bg-draft-bg text-draft-fg inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold">
                        <span className="bg-draft size-[5px] rounded-full" />
                        {row.isNew ? "New" : "Draft"}
                      </span>
                    ) : (
                      <span className="bg-status-success-bg text-status-success rounded-full px-2 py-0.5 text-[10.5px] font-bold">
                        Published
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {editing && (
          <div className="w-[430px] shrink-0 border-l">
            <EntryEditor
              schemaName={collection.name}
              mode={editing}
              schemaOverride={schema}
              onClose={() => setEditing(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
