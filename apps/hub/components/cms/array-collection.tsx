"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "@/components/icon";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useConfig } from "@/contexts/config-context";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDrafts,
  useDraftsStore,
} from "@/lib/store/drafts";
import { initializeState } from "@workspace/cms-core/schema";
import {
  arrayItemSchema,
  type ManifestCollection,
} from "@/lib/engine/collections";

import { EntryForm } from "@/components/entry/entry-form";

type Item = Record<string, unknown>;

/**
 * CMS v2 ARRAY collection panel: the whole collection is a single JSON file
 * holding `[ {item}, … ]`, edited as one draft and published as one commit
 * (like pages.json / site.json). Order IS array position — reorder just moves
 * the item. Add/edit/delete/reorder all rewrite the whole-array draft keyed by
 * the collection file path; nothing hits GitHub until Publish.
 */
export function ArrayCollection({
  collection,
}: {
  collection: ManifestCollection;
}) {
  const { config } = useConfig();
  const trpc = useTRPC();
  const deleteDraftFromStore = useDraftsStore((state) => state.deleteDraft);
  const [editing, setEditing] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";

  const schema = useMemo(() => arrayItemSchema(collection), [collection]);
  const primary: string = schema.view.primary;

  const fileQuery = useQuery(
    trpc.cms.entries.getContent.queryOptions(
      { owner, repo, branch, path: collection.path },
      {
        enabled: Boolean(owner && repo && branch),
        staleTime: 30_000,
        retry: (failureCount, error) =>
          !/not found/i.test(String((error as { message?: string })?.message)) &&
          failureCount < 2,
      }
    )
  );

  // The collection file may not exist yet — a 404 means an empty collection.
  const fileMissing = Boolean(
    fileQuery.isError &&
      /not found/i.test(String((fileQuery.error as { message?: string })?.message))
  );
  const remoteSha = fileQuery.data?.sha ?? null;
  const remoteItems = useMemo<Item[]>(() => {
    const content = fileQuery.data?.contentObject;
    return Array.isArray(content) ? (content as Item[]) : [];
  }, [fileQuery.data]);

  // Subscribe to this collection's draft (the whole array), if any.
  const drafts = useDrafts(owner, repo, branch);
  const draft = useMemo(
    () => drafts.find(([, d]) => d.path === collection.path)?.[1] ?? null,
    [drafts, collection.path]
  );
  const hasDraft = Boolean(draft);

  const items: Item[] = useMemo(() => {
    if (draft && Array.isArray(draft.values)) return draft.values as Item[];
    return remoteItems;
  }, [draft, remoteItems]);

  const commitItems = (next: Item[]) => {
    if (!config) return;
    const key = draftKey(owner, repo, branch, collection.path);
    const existing = getDraft(owner, repo, branch, collection.path);
    try {
      saveDraftOrThrow(key, {
        v: 1,
        path: collection.path,
        schemaName: collection.name,
        sha: existing?.sha ?? remoteSha ?? null,
        isNew: fileMissing,
        values: next,
        savedAt: Date.now(),
        title: collection.label ?? collection.name,
      });
    } catch (error: any) {
      toast.error(error?.message || "Could not save the draft.");
    }
  };

  const rowLabel = (item: Item, index: number): string => {
    const raw = item?.[primary];
    return typeof raw === "string" && raw.trim() ? raw : `Item ${index + 1}`;
  };

  const handleAdd = () => {
    const blank = initializeState(schema.fields, {}) as Item;
    // New items go to the top (index 0), not the bottom — order is array
    // position, so the newest entry shows first.
    const next = [blank, ...items];
    commitItems(next);
    setEditing(0);
    setSheetOpen(true);
  };

  const handleDelete = (index: number) => {
    commitItems(items.filter((_, i) => i !== index));
  };

  const handleSubmitItem = (index: number, values: Record<string, unknown>) => {
    commitItems(items.map((item, i) => (i === index ? values : item)));
    toast.success("Saved on this device — publish to go live");
    setSheetOpen(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    commitItems(arrayMove(items, from, to));
  };

  const label = collection.label ?? collection.name;
  const editingItem =
    editing !== null && editing < items.length ? items[editing] : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        {hasDraft && <Badge variant="secondary">Draft</Badge>}
        <Button size="sm" className="ml-auto" onClick={handleAdd}>
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <div className="scrollbar flex-1 overflow-y-auto p-4 md:p-6">
        {fileQuery.isLoading ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            Loading items…
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No items yet — add the first one.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((_, i) => String(i))}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y rounded-lg border">
                {items.map((item, index) => (
                  <SortableRow
                    key={index}
                    id={String(index)}
                    label={rowLabel(item, index)}
                    onOpen={() => {
                      setEditing(index);
                      setSheetOpen(true);
                    }}
                    onDelete={() => handleDelete(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOpenChangeComplete={(next) => {
          if (!next) setEditing(null);
        }}
      >
        <SheetContent
          side="right"
          className="z-50 w-full overflow-x-hidden overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>{label}</SheetTitle>
            <SheetDescription>
              Saved on this device until you publish.
            </SheetDescription>
          </SheetHeader>
          {editingItem && editing !== null ? (
            <>
              <div className="px-4 pb-24">
                <EntryForm
                  key={editing}
                  formId="array-item-form"
                  fields={schema.fields}
                  contentObject={editingItem}
                  onSubmit={(values) => handleSubmitItem(editing, values)}
                />
              </div>
              <div className="bg-background sticky bottom-0 border-t p-4">
                <Button type="submit" form="array-item-form" className="w-full">
                  Save item
                </Button>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground py-16 text-center text-sm">
              Select an item to edit.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SortableRow({
  id,
  label,
  onOpen,
  onDelete,
}: {
  id: string;
  label: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      // No `transition` — rows snap to their new position on drop (no slide).
      style={{ transform: CSS.Transform.toString(transform) }}
      className={cn(
        "bg-background flex items-center gap-2 px-2 py-2",
        isDragging && "opacity-60"
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab px-1"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-muted/50 min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm font-medium"
      >
        {label}
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive size-8"
        onClick={onDelete}
        aria-label="Delete item"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
