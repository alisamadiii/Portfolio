"use client";

import { useMemo } from "react";
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
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFieldArray, useWatch } from "react-hook-form";
import { ArrowUpRight, FolderOpen, Image as ImageIcon, Trash2 } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { isAbsoluteMediaUrl } from "@workspace/cms-core/utils/file";

import { useMediaLibrary } from "@/components/media/media-library-context";
import { UrlPopover } from "@/components/media/url-popover";
import { Thumbnail } from "@/components/thumbnail";

type GalleryFieldMeta = {
  name?: string;
  label?: string | false;
  readonly?: boolean | null;
};

/**
 * Purpose-built editor for a `gallery` field — an array of absolute image URLs
 * (typically ImageKit CDN). Instead of a stack of text inputs, it shows every
 * image as a thumbnail tile (drag to reorder, hover to remove) and adds new
 * images through the existing ImageKit media library or a pasted URL.
 *
 * Selected via `isGalleryField` in `entry-form.tsx`; falls back to the normal
 * scalar-list editor when no hosted media provider is available.
 */
export function GalleryField({
  field,
  fieldName,
}: {
  field: GalleryFieldMeta;
  fieldName: string;
}) {
  const isReadonly = Boolean(field.readonly);
  const { isAvailable, open } = useMediaLibrary();

  const { fields: arrayFields, append, remove, move } = useFieldArray({
    name: fieldName,
  });
  // `arrayFields` carries stable ids for dnd; `values` carries the live URLs.
  const values = (useWatch({ name: fieldName }) as unknown[] | undefined) ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortableItems = useMemo(
    () => arrayFields.map((item) => item.id),
    [arrayFields]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (isReadonly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = arrayFields.findIndex((item) => item.id === active.id);
    const newIndex = arrayFields.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    move(oldIndex, newIndex);
  };

  const addUrls = (urls: string[]) => {
    for (const url of urls) {
      const trimmed = url.trim();
      if (trimmed) append(trimmed);
    }
  };

  const openLibrary = () =>
    open({
      onInsert: addUrls,
      title: typeof field.label === "string" ? field.label : "Gallery",
    });

  return (
    <div
      data-field-path={fieldName}
      className="border-border/70 bg-muted/30 space-y-3 rounded-xl border p-4"
    >
      <div className="flex h-5 items-center gap-x-2">
        {field.label !== false && (
          <span className="text-sm font-semibold">
            {field.label || field.name}
          </span>
        )}
        {arrayFields.length > 0 && (
          <span className="text-muted-foreground text-xs font-medium">
            {arrayFields.length}
          </span>
        )}
      </div>

      {arrayFields.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {arrayFields.map((arrayField, index) => (
                <GalleryTile
                  key={arrayField.id}
                  id={arrayField.id}
                  url={String(values[index] ?? "")}
                  readonly={isReadonly}
                  onRemove={() => remove(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!isReadonly && (
        <div className="flex flex-wrap items-center gap-2">
          {isAvailable && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openLibrary}
            >
              <FolderOpen />
              Media library
            </Button>
          )}
          <UrlPopover
            submitLabel="Add image"
            placeholder="https://cdn.example.com/image.png"
            onSubmit={(url) => addUrls([url])}
          />
        </div>
      )}
    </div>
  );
}

const GalleryTile = ({
  id,
  url,
  readonly,
  onRemove,
}: {
  id: string;
  url: string;
  readonly: boolean;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative" as const,
  };

  const isExternal = isAbsoluteMediaUrl(url);

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        title={url}
        className={cn("touch-none", readonly ? undefined : "cursor-move")}
        {...(!readonly ? attributes : {})}
        {...(!readonly ? listeners : {})}
      >
        {url ? (
          <Thumbnail path={url} className="h-28 w-28 rounded-md" />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-28 w-28 items-center justify-center rounded-md">
            <ImageIcon className="size-4" />
          </div>
        )}
      </div>
      <div className="bg-background/95 absolute right-1 bottom-1 rounded-md opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <ButtonGroup>
          {isExternal && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    render={
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open image URL"
                      >
                        <ArrowUpRight />
                      </a>
                    }
                  />
                }
              />
              <TooltipContent>Open URL</TooltipContent>
            </Tooltip>
          )}
          {!readonly && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={onRemove}
                    aria-label="Remove image"
                  >
                    <Trash2 />
                  </Button>
                }
              />
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          )}
        </ButtonGroup>
      </div>
    </div>
  );
};
