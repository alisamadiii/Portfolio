"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { editComponents } from "@/fields/registry";
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
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Asterisk,
  Ban,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";

import { Field } from "@/types/field";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Label } from "@workspace/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import {
  generateZodSchema,
  getDefaultValue,
  initializeState,
  interpolate,
  sanitizeObject,
} from "@/lib/schema";

type BeforeSubmitHook = () => void | Promise<void>;
type RegisterBeforeSubmitHook = (
  key: string,
  hook: BeforeSubmitHook
) => () => void;

type FieldWithReadonlyMeta = Field & {
  __inheritedReadonly?: boolean;
};

type RenderFields = (
  fields: FieldWithReadonlyMeta[],
  parentName?: string,
  registerBeforeSubmitHook?: RegisterBeforeSubmitHook,
  runBeforeSubmitHooks?: () => Promise<void>,
  inheritedReadonly?: boolean,
  keyPrefix?: string
) => React.ReactNode[];

type NestedFieldProps = {
  field: FieldWithReadonlyMeta;
  fieldName: string;
  renderFields: RenderFields;
  registerBeforeSubmitHook?: RegisterBeforeSubmitHook;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  index?: number;
  keyPrefix?: string;
};

const hasFieldPathError = (errors: unknown, fieldName: string): boolean => {
  let current: unknown = errors;
  for (const part of fieldName.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return Boolean(current);
};

const getCollapsibleItemLabel = (
  field: Field,
  fieldValues: unknown,
  index?: number
): string => {
  if (
    typeof field.list === "object" &&
    field.list.collapsible &&
    typeof field.list.collapsible === "object" &&
    field.list.collapsible.summary
  ) {
    return interpolate(
      field.list.collapsible.summary,
      {
        index: index !== undefined ? `${index + 1}` : "",
        fields: fieldValues as Record<string, unknown>,
      },
      "fields"
    );
  }

  return `Item ${index !== undefined ? `#${index + 1}` : ""}`;
};

const hasCollapsibleSummary = (field: Field) =>
  typeof field.list === "object" &&
  !!field.list.collapsible &&
  typeof field.list.collapsible === "object" &&
  !!field.list.collapsible.summary;

const hasExplicitReadonly = (field: Field) =>
  Boolean(field.readonly) &&
  !(field as FieldWithReadonlyMeta).__inheritedReadonly;

const SortableItem = ({
  id,
  children,
  readonly = false,
}: {
  id: string;
  children: React.ReactNode;
  readonly?: boolean;
}) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-x-1",
        isDragging ? "z-50 opacity-50" : "z-10"
      )}
      style={style}
    >
      {!readonly && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground h-auto w-6 cursor-move self-stretch"
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </Button>
      )}
      {children}
    </div>
  );
};

const ListItemRow = memo(function ListItemRow({
  id,
  field,
  fieldName,
  index,
  isOpen,
  defaultOpen,
  isPendingRemove,
  renderFields,
  registerBeforeSubmitHook,
  onToggleOpen,
  onRequestRemove,
  onRemoveConfirm,
  onPendingRemoveChange,
}: {
  id: string;
  field: FieldWithReadonlyMeta;
  fieldName: string;
  index: number;
  isOpen?: boolean;
  defaultOpen: boolean;
  isPendingRemove: boolean;
  renderFields: RenderFields;
  registerBeforeSubmitHook?: RegisterBeforeSubmitHook;
  onToggleOpen: (index: number) => void;
  onRequestRemove: (index: number) => void;
  onRemoveConfirm: (index: number) => void;
  onPendingRemoveChange: (index: number, open: boolean) => void;
}) {
  const isReadonly = Boolean(field.readonly);
  return (
    <SortableItem id={id} readonly={isReadonly}>
      <div className="grid flex-1 gap-6">
        <SingleField
          field={field}
          fieldName={`${fieldName}.${index}`}
          keyPrefix={id}
          renderFields={renderFields}
          registerBeforeSubmitHook={registerBeforeSubmitHook}
          showLabel={false}
          isOpen={isOpen ?? defaultOpen}
          toggleOpen={() => onToggleOpen(index)}
          index={index}
        />
      </div>
      {!isReadonly && (
        <Tooltip>
          <AlertDialog
            open={isPendingRemove}
            onOpenChange={(open) => onPendingRemoveChange(index, open)}
          >
            <TooltipTrigger
              render={
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground self-start"
                      onClick={() => onRequestRemove(index)}
                    >
                      <Trash2 />
                    </Button>
                  }
                />
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemoveConfirm(index)}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <TooltipContent>Remove item</TooltipContent>
        </Tooltip>
      )}
    </SortableItem>
  );
});

const ListField = ({
  field,
  fieldName,
  renderFields,
  registerBeforeSubmitHook,
  runBeforeSubmitHooks,
}: {
  field: FieldWithReadonlyMeta;
  fieldName: string;
  renderFields: RenderFields;
  registerBeforeSubmitHook?: RegisterBeforeSubmitHook;
  runBeforeSubmitHooks?: () => Promise<void>;
}) => {
  const supportsItemCollapse =
    field.type === "object" || field.type === "block";
  const isCollapsible = !!(
    supportsItemCollapse &&
    field.list &&
    !(typeof field.list === "object" && field.list?.collapsible === false)
  );
  const defaultOpen = useMemo(() => {
    const defaultCollapsed =
      isCollapsible &&
      typeof field.list === "object" &&
      field.list.collapsible &&
      typeof field.list.collapsible === "object" &&
      field.list.collapsible.collapsed;
    return !defaultCollapsed;
  }, [field.list, isCollapsible]);

  const {
    fields: arrayFields,
    append,
    remove,
    move,
  } = useFieldArray({
    name: fieldName,
  });
  const [openStates, setOpenStates] = useState<boolean[]>([]);
  const shouldShowListHeader =
    field.label !== false ||
    field.required ||
    (isCollapsible && arrayFields.length > 0);
  const isReadonly = Boolean(field.readonly);

  useEffect(() => {
    setOpenStates((prev) => {
      if (prev.length === arrayFields.length) {
        return prev;
      }
      if (prev.length === 0 && arrayFields.length > 0) {
        return Array(arrayFields.length).fill(defaultOpen);
      }
      if (prev.length < arrayFields.length) {
        return [
          ...prev,
          ...Array(arrayFields.length - prev.length).fill(defaultOpen),
        ];
      }
      return prev.slice(0, arrayFields.length);
    });
  }, [arrayFields.length, defaultOpen]);

  const toggleOpen = useCallback((index: number) => {
    setOpenStates((prev) =>
      prev.map((isOpen, currentIndex) =>
        currentIndex === index ? !isOpen : isOpen
      )
    );
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isReadonly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = arrayFields.findIndex((item) => item.id === active.id);
    const newIndex = arrayFields.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    await runBeforeSubmitHooks?.();
    setOpenStates((prev) => arrayMove(prev, oldIndex, newIndex));
    move(oldIndex, newIndex);
  };

  const addItem = async () => {
    if (isReadonly) return;
    await runBeforeSubmitHooks?.();
    append(
      field.type === "object"
        ? initializeState(field.fields, {})
        : getDefaultValue(field)
    );
    setOpenStates((prev) => [...prev, true]);
  };

  const removeItem = useCallback(
    async (index: number) => {
      if (isReadonly) return;
      await runBeforeSubmitHooks?.();
      remove(index);
      setOpenStates((prev) =>
        prev.filter((_, currentIndex) => currentIndex !== index)
      );
    },
    [isReadonly, remove, runBeforeSubmitHooks]
  );
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const modifiers = useMemo(
    () => [restrictToVerticalAxis, restrictToParentElement],
    []
  );
  const sortableItems = useMemo(
    () => arrayFields.map((item) => item.id),
    [arrayFields]
  );

  const handleToggleOpen = useCallback(
    (index: number) => {
      toggleOpen(index);
    },
    [toggleOpen]
  );
  const handleRequestRemove = useCallback((index: number) => {
    setPendingRemoveIndex(index);
  }, []);
  const handlePendingRemoveChange = useCallback(
    (index: number, open: boolean) => {
      if (open) return;
      setPendingRemoveIndex((prev) => (prev === index ? null : prev));
    },
    []
  );
  const handleRemoveConfirm = useCallback(
    (index: number) => {
      removeItem(index);
      setPendingRemoveIndex(null);
    },
    [removeItem]
  );

  const toggleAll = (collapsed: boolean) => {
    setOpenStates(Array(arrayFields.length).fill(!collapsed));
  };

  // We don't render <FormMessage/> in ListField, because it's already rendered in the individual fields
  return (
    <FormField
      name={fieldName}
      render={() => (
        <FormItem>
          {shouldShowListHeader && (
            <div className="flex h-5 items-center gap-x-2">
              {field.label !== false && (
                <FormLabel className="text-sm font-medium">
                  {field.label || field.name}
                </FormLabel>
              )}
              {field.required && (
                <Badge variant="secondary" className="text-muted-foreground">
                  <Asterisk className="-mr-0.5 -ml-1" />
                  Required
                </Badge>
              )}
              {hasExplicitReadonly(field) && (
                <Badge variant="secondary" className="text-muted-foreground">
                  <Ban className="-ml-0.5" />
                  Readonly
                </Badge>
              )}
              {isCollapsible &&
                arrayFields.length > 0 &&
                (() => {
                  const isAllExpanded =
                    openStates.length > 0 && openStates.every(Boolean);
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-foreground ml-auto"
                      onClick={() => toggleAll(isAllExpanded)}
                    >
                      {isAllExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
                      {isAllExpanded ? "Collapse all" : "Expand all"}
                    </Button>
                  );
                })()}
            </div>
          )}
          <div className="space-y-2">
            <DndContext
              sensors={sensors}
              modifiers={modifiers}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableItems}
                strategy={verticalListSortingStrategy}
              >
                {arrayFields.map((arrayField, index) => (
                  <ListItemRow
                    key={arrayField.id}
                    id={arrayField.id}
                    field={field}
                    fieldName={fieldName}
                    index={index}
                    isOpen={openStates[index]}
                    defaultOpen={defaultOpen}
                    isPendingRemove={pendingRemoveIndex === index}
                    renderFields={renderFields}
                    registerBeforeSubmitHook={registerBeforeSubmitHook}
                    onToggleOpen={handleToggleOpen}
                    onRequestRemove={handleRequestRemove}
                    onRemoveConfirm={handleRemoveConfirm}
                    onPendingRemoveChange={handlePendingRemoveChange}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div className="flex flex-wrap items-center gap-2">
              {isReadonly ? null : typeof field.list === "object" &&
                field.list?.max &&
                arrayFields.length >= field.list.max ? null : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus />
                  Add an item
                </Button>
              )}
            </div>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
};

const BlocksField = forwardRef<HTMLDivElement, NestedFieldProps>(
  (props, ref) => {
    const {
      field,
      fieldName,
      renderFields,
      registerBeforeSubmitHook,
      isOpen,
      onToggleOpen,
      index,
      keyPrefix,
    } = props;

    const isCollapsible = !!(
      field.list &&
      !(typeof field.list === "object" && field.list?.collapsible === false)
    );

    const {
      control,
      setValue,
      formState: { errors },
    } = useFormContext();

    const value = useWatch({ control, name: fieldName });
    const onChange = (val: Record<string, unknown> | null) => {
      setValue(fieldName, val, { shouldDirty: true });
    };

    const hasErrors = () => {
      return hasFieldPathError(errors, fieldName);
    };

    const { blocks = [] } = field;
    const blockKey = field.blockKey || "_block";
    const selectedBlockName = value?.[blockKey];
    const [isRemoveBlockDialogOpen, setIsRemoveBlockDialogOpen] =
      useState(false);
    const isReadonly = Boolean(field.readonly);

    const handleBlockSelect = (blockName: string) => {
      if (isReadonly) return;
      const selectedBlockDef = blocks.find((b: Field) => b.name === blockName);
      if (!selectedBlockDef) return;
      let initialState: Record<string, unknown> = { [blockKey]: blockName };
      if (selectedBlockDef.fields) {
        const choiceDefaults = initializeState(selectedBlockDef.fields, {});
        initialState = { ...initialState, ...choiceDefaults };
      }
      onChange(initialState);
    };

    const handleRemoveBlock = () => {
      if (isReadonly) return;
      onChange(null);
    };

    const selectedBlockDefinition = useMemo(() => {
      const definition = blocks.find(
        (b: Field) => b.name === selectedBlockName
      );
      return definition;
    }, [blocks, selectedBlockName]);

    const itemLabel = getCollapsibleItemLabel(field, value, index);

    return (
      <div className="space-y-3" ref={ref as React.Ref<HTMLDivElement>}>
        {!selectedBlockDefinition ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="text-sm">Choose content block:</div>
            <div className="flex flex-wrap gap-2">
              {blocks.map((blockDef: Field) => (
                <Button
                  key={blockDef.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-x-2"
                  onClick={() => handleBlockSelect(blockDef.name)}
                  disabled={isReadonly}
                >
                  {blockDef.label || blockDef.name}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border">
            <header
              className={cn(
                "flex h-8.5 items-center gap-x-2 rounded-t-lg px-4 text-sm font-medium transition-colors",
                isOpen ? "" : "rounded-b-lg",
                isCollapsible ? "hover:bg-muted cursor-pointer" : ""
              )}
              onClick={isCollapsible ? onToggleOpen : undefined}
            >
              {isCollapsible && (
                <>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      isOpen ? "rotate-90" : ""
                    )}
                  />
                  <span
                    className={cn(
                      "truncate",
                      hasErrors() ? "text-destructive" : ""
                    )}
                  >
                    {itemLabel}
                  </span>
                </>
              )}
              <Badge
                className="text-muted-foreground -mr-2 ml-auto"
                variant="outline"
              >
                {selectedBlockDefinition.label || selectedBlockDefinition.name}

                {!isReadonly && (
                  <Tooltip>
                    <AlertDialog
                      open={isRemoveBlockDialogOpen}
                      onOpenChange={setIsRemoveBlockDialogOpen}
                    >
                      <TooltipTrigger
                        render={
                          <AlertDialogTrigger
                            render={
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setIsRemoveBlockDialogOpen(true);
                                }}
                                className="text-muted-foreground hover:text-foreground -mx-2 -my-0.5 px-2 transition-colors"
                              >
                                <X className="size-3" />
                              </button>
                            }
                          />
                        }
                      />
                      <AlertDialogContent
                        onClick={(event) => event.stopPropagation()}
                      >
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remove this block?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              handleRemoveBlock();
                              setIsRemoveBlockDialogOpen(false);
                            }}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <TooltipContent>Remove block</TooltipContent>
                  </Tooltip>
                )}
              </Badge>
            </header>
            <div
              className={cn("grid gap-6 border-t p-4", isOpen ? "" : "hidden")}
            >
              {selectedBlockDefinition.type === "object" ? (
                (() => {
                  const renderedElements = renderFields(
                    selectedBlockDefinition.fields || [],
                    fieldName,
                    registerBeforeSubmitHook,
                    undefined,
                    isReadonly,
                    keyPrefix
                  );
                  return renderedElements;
                })()
              ) : (
                <SingleField
                  field={
                    isReadonly
                      ? {
                          ...selectedBlockDefinition,
                          readonly: true,
                          __inheritedReadonly: true,
                        }
                      : selectedBlockDefinition
                  }
                  fieldName={fieldName}
                  keyPrefix={keyPrefix}
                  renderFields={renderFields}
                  registerBeforeSubmitHook={registerBeforeSubmitHook}
                  showLabel={false}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

BlocksField.displayName = "BlocksField";

const ObjectFieldSummaryLabel = ({
  field,
  fieldName,
  index,
}: {
  field: FieldWithReadonlyMeta;
  fieldName: string;
  index?: number;
}) => {
  const { control } = useFormContext();
  const fieldValues = useWatch({ control, name: fieldName });
  return <>{getCollapsibleItemLabel(field, fieldValues, index)}</>;
};

const ObjectField = forwardRef<HTMLDivElement, NestedFieldProps>(
  (props, ref) => {
    const {
      field,
      fieldName,
      renderFields,
      registerBeforeSubmitHook,
      isOpen = true,
      onToggleOpen = () => {},
      index,
      keyPrefix,
    } = props;

    const isCollapsible = !!(
      field.list &&
      !(typeof field.list === "object" && field.list?.collapsible === false)
    );

    const {
      formState: { errors },
    } = useFormContext();

    const hasErrors = () => {
      return hasFieldPathError(errors, fieldName);
    };

    const itemLabel = hasCollapsibleSummary(field) ? (
      <ObjectFieldSummaryLabel
        field={field}
        fieldName={fieldName}
        index={index}
      />
    ) : (
      `Item ${index !== undefined ? `#${index + 1}` : ""}`
    );

    return (
      <div className="rounded-lg border">
        {isCollapsible && (
          <header
            className={cn(
              "hover:bg-muted flex h-8.5 cursor-pointer items-center gap-x-2 rounded-t-lg pr-1 pl-4 text-sm font-medium transition-colors",
              isOpen ? "" : "rounded-b-lg"
            )}
            onClick={onToggleOpen}
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform",
                isOpen ? "rotate-90" : ""
              )}
            />
            <span className={hasErrors() ? "text-destructive" : ""}>
              {itemLabel}
            </span>
          </header>
        )}
        <div
          className={cn(
            "grid gap-6 p-4",
            isCollapsible && "border-t",
            isOpen ? "" : "hidden"
          )}
        >
          {renderFields(
            field.fields || [],
            fieldName,
            registerBeforeSubmitHook,
            undefined,
            Boolean(field.readonly),
            keyPrefix
          )}
        </div>
      </div>
    );
  }
);

ObjectField.displayName = "ObjectField";

const SingleField = ({
  field,
  fieldName,
  renderFields,
  registerBeforeSubmitHook,
  onChangeRegistered,
  showLabel = true,
  isOpen = true,
  toggleOpen = () => {},
  index = 0,
  keyPrefix,
}: {
  field: FieldWithReadonlyMeta;
  fieldName: string;
  renderFields: RenderFields;
  registerBeforeSubmitHook?: RegisterBeforeSubmitHook;
  onChangeRegistered?: () => void;
  showLabel?: boolean;
  isOpen?: boolean;
  toggleOpen?: () => void;
  index?: number;
  keyPrefix?: string;
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const isRichTextField = field.type === "rich-text";
  const showLabelSlot = isRichTextField && field.options?.switcher !== false;
  const shouldShowFieldMeta =
    showLabel && (field.label !== false || field.required || showLabelSlot);
  const rawLabelSlotId = useId();
  const labelSlotId = useMemo(
    () => `field-label-slot-${rawLabelSlotId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawLabelSlotId]
  );

  const isCollapsible = !!(
    field.list &&
    !(typeof field.list === "object" && field.list?.collapsible === false)
  );

  if (["object", "block"].includes(field.type)) {
    const hasErrors = () => hasFieldPathError(errors, fieldName);
    const NestedComponent = field.type === "block" ? BlocksField : ObjectField;

    return (
      <FormItem key={fieldName}>
        {shouldShowFieldMeta && (
          <div className="flex h-5 items-center gap-x-2">
            {field.label !== false && (
              <Label className={hasErrors() ? "text-destructive" : ""}>
                {field.label || field.name}
              </Label>
            )}
            {field.required && (
              <Badge variant="secondary" className="text-muted-foreground">
                <Asterisk className="-mr-0.5 -ml-1" />
                Required
              </Badge>
            )}
            {hasExplicitReadonly(field) && (
              <Badge variant="secondary" className="text-muted-foreground">
                <Ban className="-ml-0.5" />
                Readonly
              </Badge>
            )}
          </div>
        )}
        <NestedComponent
          field={field}
          fieldName={fieldName}
          keyPrefix={keyPrefix}
          renderFields={renderFields}
          registerBeforeSubmitHook={registerBeforeSubmitHook}
          isOpen={isOpen}
          onToggleOpen={isCollapsible ? toggleOpen : undefined}
          index={isCollapsible ? index : undefined}
        />
        {field.description && (
          <FormDescription>{field.description}</FormDescription>
        )}
      </FormItem>
    );
  } else {
    let FieldComponent;

    if (typeof field.type === "string" && editComponents[field.type]) {
      FieldComponent = editComponents[field.type];
    } else {
      console.warn(
        `No component found for field type: ${field.type}. Defaulting to 'text'.`
      );
      FieldComponent = editComponents["text"];
    }

    return (
      <FormField
        name={fieldName}
        control={control}
        render={({ field: rhfManagedFieldProps }) => (
          <FormItem>
            {shouldShowFieldMeta && (
              <div className="flex min-h-6 items-center justify-between gap-x-2">
                <div className="flex min-w-0 items-center gap-x-2">
                  {field.label !== false && (
                    <FormLabel>{field.label || field.name}</FormLabel>
                  )}
                  {field.required && (
                    <Badge
                      variant="secondary"
                      className="text-muted-foreground"
                    >
                      <Asterisk className="-mr-0.5 -ml-1" />
                      Required
                    </Badge>
                  )}
                  {hasExplicitReadonly(field) && (
                    <Badge
                      variant="secondary"
                      className="text-muted-foreground"
                    >
                      <Ban className="-ml-0.5" />
                      Readonly
                    </Badge>
                  )}
                </div>
                {showLabelSlot && <div id={labelSlotId} className="shrink-0" />}
              </div>
            )}
            <FormControl>
              {(() => {
                const sharedProps = {
                  ...rhfManagedFieldProps,
                  field,
                };
                if (field.type === "rich-text") {
                  return (
                    <FieldComponent
                      {...sharedProps}
                      labelSlotId={showLabelSlot ? labelSlotId : undefined}
                      registerBeforeSubmitHook={registerBeforeSubmitHook}
                      onChangeRegistered={onChangeRegistered}
                    />
                  );
                }
                return <FieldComponent {...sharedProps} />;
              })()}
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }
};

SingleField.displayName = "SingleField";

const EntryForm = ({
  fields,
  contentObject,
  onSubmit = () => {},
  filePath,
  onDirtyChange,
  onChangeRegistered,
}: {
  fields: Field[];
  contentObject?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  filePath?: React.ReactNode;
  onDirtyChange?: (isDirty: boolean) => void;
  onChangeRegistered?: () => void;
}) => {
  const zodSchema = useMemo(() => {
    return generateZodSchema(fields);
  }, [fields]);

  const defaultValues = useMemo(() => {
    return initializeState(fields, sanitizeObject(contentObject));
  }, [fields, contentObject]);

  const form = useForm({
    // The CMS is on zod v3 while resolvers' types resolve against the
    // workspace-hoisted zod v4 — the runtime shapes match, the types don't.
    resolver:
      zodSchema &&
      zodResolver(zodSchema as unknown as Parameters<typeof zodResolver>[0]),
    defaultValues,
    reValidateMode: "onSubmit",
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  const beforeSubmitHooksRef = useRef<Map<string, BeforeSubmitHook>>(new Map());

  const registerBeforeSubmitHook = useCallback(
    (key: string, hook: BeforeSubmitHook) => {
      beforeSubmitHooksRef.current.set(key, hook);
      return () => {
        beforeSubmitHooksRef.current.delete(key);
      };
    },
    []
  );

  const renderFields: RenderFields = useCallback(
    (
      fields: FieldWithReadonlyMeta[],
      parentName?: string,
      registerBeforeSubmitHook?: RegisterBeforeSubmitHook,
      runBeforeSubmitHooks?: () => Promise<void>,
      inheritedReadonly = false,
      keyPrefix?: string
    ): React.ReactNode[] => {
      return fields.map((field) => {
        if (!field || field.hidden) return null;
        const effectiveField =
          inheritedReadonly && !field.readonly
            ? { ...field, readonly: true, __inheritedReadonly: true }
            : field;
        const currentFieldName = parentName
          ? `${parentName}.${effectiveField.name}`
          : effectiveField.name;
        const currentFieldKey = keyPrefix
          ? `${keyPrefix}.${effectiveField.name}`
          : currentFieldName;

        if (
          effectiveField.list === true ||
          (typeof effectiveField.list === "object" &&
            effectiveField.list !== null)
        ) {
          return (
            <ListField
              key={currentFieldKey}
              field={effectiveField}
              fieldName={currentFieldName}
              renderFields={renderFields}
              registerBeforeSubmitHook={registerBeforeSubmitHook}
              runBeforeSubmitHooks={runBeforeSubmitHooks}
            />
          );
        }
        return (
          <SingleField
            key={currentFieldKey}
            field={effectiveField}
            fieldName={currentFieldName}
            keyPrefix={currentFieldKey}
            renderFields={renderFields}
            registerBeforeSubmitHook={registerBeforeSubmitHook}
            onChangeRegistered={onChangeRegistered}
          />
        );
      });
    },
    [onChangeRegistered]
  );

  const runBeforeValidationHooks = useCallback(async () => {
    const hooks = Array.from(beforeSubmitHooksRef.current.values());
    for (const hook of hooks) {
      await hook();
    }
  }, []);

  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      const latestValues = form.getValues() as Record<string, unknown>;
      await onSubmit(latestValues);
    },
    [form, onSubmit]
  );

  const handleError = () => {
    toast.error("Please fix the errors before saving.", { duration: 5000 });
  };

  const handleFormSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await runBeforeValidationHooks();
      await form.handleSubmit(handleSubmit, handleError)(event);
    },
    [form, handleSubmit, runBeforeValidationHooks]
  );

  return (
    <Form {...form}>
      <form
        id="entry-form"
        onSubmit={handleFormSubmit}
        className="mx-auto grid w-full max-w-screen-md items-start gap-6"
      >
        {filePath && (
          <div className="space-y-2 overflow-hidden">
            <FormLabel>Filename</FormLabel>
            {filePath}
          </div>
        )}
        {renderFields(
          fields,
          undefined,
          registerBeforeSubmitHook,
          runBeforeValidationHooks
        )}
      </form>
    </Form>
  );
};

export { EntryForm };
