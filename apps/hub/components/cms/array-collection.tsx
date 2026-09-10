"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/contexts/config-context";
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
import { useQuery } from "@tanstack/react-query";
import { initializeState } from "@workspace/cms-core/schema";
import type { Field } from "@workspace/cms-core/types/field";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import {
  arrayItemSchema,
  type ManifestCollection,
} from "@/lib/engine/collections";
import { entryFieldsFromValue } from "@/lib/engine/entry-schema";
import { mergeItems } from "@/lib/engine/infer";
import {
  draftKey,
  getDraft,
  saveDraftOrThrow,
  useDrafts,
  useDraftsStore,
} from "@/lib/store/drafts";

import {
  buildColumns,
  CollectionCell,
  CollectionTableHeader,
  gridTemplate,
  withFallback,
  type ColumnDef,
} from "@/components/cms/collection-table";
import { EntryForm } from "@/components/entry/entry-form";
import { GripVertical, Plus, Trash2, X } from "@/components/icon";

type Item = Record<string, unknown>;

/**
 * CMS v2 ARRAY collection panel: the whole collection is a single JSON file
 * holding `[ {item}, … ]`, edited as one draft and published as one commit
 * (like _pages.json / _site.json). Order IS array position — reorder just moves
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
          !/not found/i.test(
            String((error as { message?: string })?.message)
          ) && failureCount < 2,
      }
    )
  );

  // The collection file may not exist yet — a 404 means an empty collection.
  const fileMissing = Boolean(
    fileQuery.isError &&
    /not found/i.test(
      String((fileQuery.error as { message?: string })?.message)
    )
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

  // Infer the per-item fields from the actual items (so arrays/objects/datetime
  // inside an item are editable), overlaying manifest labels/widgets and keeping
  // any declared field the data doesn't have yet. Empty collection → the flat
  // manifest schema (nothing to infer from).
  const itemFields = useMemo<Field[]>(() => {
    if (items.length === 0) return schema.fields as Field[];
    const inferred = entryFieldsFromValue(mergeItems(items), collection.fields);
    // Only a collection that DECLARES fields gets its unfilled ones appended.
    // Discovered collections carry no real declaration — `schema.fields` is the
    // synthetic DEFAULT_FIELDS fallback (a required `title`), which must not
    // leak into a non-empty collection whose shape is fully inferred from data.
    if (!collection.fields.length) return inferred;
    const names = new Set(inferred.map((field) => field.name));
    const declaredMissing = (schema.fields as Field[]).filter(
      (field) => !names.has(field.name)
    );
    return [...inferred, ...declaredMissing];
  }, [items, collection, schema]);

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
    const blank = initializeState(itemFields, {}) as Item;
    // New items go to the top (index 0), not the bottom — order is array
    // position, so the newest entry shows first.
    const next = [blank, ...items];
    commitItems(next);
    setEditing(0);
  };

  const handleDelete = (index: number) => {
    commitItems(items.filter((_, i) => i !== index));
    // Indices shift — the open editor could now point at the wrong item.
    setEditing(null);
  };

  const handleSubmitItem = (index: number, values: Record<string, unknown>) => {
    commitItems(items.map((item, i) => (i === index ? values : item)));
    toast.success("Saved on this device — publish to go live");
    setEditing(null);
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
    // Indices shift — the open editor could now point at the wrong item.
    setEditing(null);
  };

  const label = collection.label ?? collection.name;
  // Discovered collections have no declared fields — derive columns from the
  // first item.
  const columns = useMemo(
    () => buildColumns(collection, (items[0] as Record<string, unknown>) ?? null),
    [collection, items]
  );
  const template = gridTemplate(columns, "40px");
  const editingItem =
    editing !== null && editing < items.length ? items[editing] : null;

  const itemsList = (
    <div className="scrollbar h-full w-full min-w-0 overflow-y-auto pb-10">
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
            <div>
              <CollectionTableHeader columns={columns} template={template} />
              {items.map((item, index) => (
                <SortableRow
                  key={index}
                  id={String(index)}
                  item={item}
                  columns={columns}
                  template={template}
                  fallbackLabel={rowLabel(item, index)}
                  active={editing === index}
                  onOpen={() => setEditing(index)}
                  onDelete={() => handleDelete(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );

  const editorPanel = editing !== null && editingItem && (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {rowLabel(editingItem, editing)}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            Saved on this device until you publish.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-1.5 size-7 shrink-0"
          onClick={() => setEditing(null)}
          aria-label="Close editor"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="scrollbar flex-1 overflow-y-auto">
        <EntryForm
          key={editing}
          formId="array-item-form"
          fields={itemFields}
          contentObject={editingItem}
          onSubmit={(values) => handleSubmitItem(editing, values)}
        />
      </div>
      <div className="bg-background flex shrink-0 gap-2 border-t p-4">
        <Button variant="outline" onClick={() => setEditing(null)}>
          Cancel
        </Button>
        <Button type="submit" form="array-item-form" className="flex-1">
          Save item
        </Button>
      </div>
    </div>
  );

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

      {editing !== null && editingItem ? (
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="cms-array-editor"
          className="min-h-0 flex-1"
        >
          <ResizablePanel defaultSize={65} minSize={35} className="min-w-0">
            {itemsList}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={35} minSize={22} maxSize={55}>
            {editorPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex min-h-0 flex-1">{itemsList}</div>
      )}
    </div>
  );
}

function SortableRow({
  id,
  item,
  columns,
  template,
  fallbackLabel,
  active,
  onOpen,
  onDelete,
}: {
  id: string;
  item: Item;
  columns: ColumnDef[];
  template: string;
  fallbackLabel: string;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      // No `transition` — rows snap to their new position on drop (no slide).
      style={{
        transform: CSS.Transform.toString(transform),
        gridTemplateColumns: template,
      }}
      className={cn(
        "bg-background hover:bg-muted/40 grid w-full cursor-pointer items-center gap-4 border-t px-2.5 py-2.5 transition-colors",
        active && "bg-muted/60",
        isDragging && "opacity-60"
      )}
      onClick={onOpen}
    >
      {columns.map((column, index) =>
        index === 0 ? (
          <span key={column.key} className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground -ml-1 shrink-0 cursor-grab"
              {...attributes}
              {...listeners}
              onClick={(event) => event.stopPropagation()}
              aria-label="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
            <CollectionCell
              column={column}
              value={withFallback(item[column.key], fallbackLabel)}
              primary
            />
          </span>
        ) : (
          <CollectionCell
            key={column.key}
            column={column}
            value={item[column.key]}
          />
        )
      )}
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive size-7 justify-self-end"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        aria-label="Delete item"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
