"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";

import { useTRPC } from "@workspace/trpc/client";
import {
  categoryLabel,
  EDITABLE_CATEGORIES,
  STAGE_LABELS,
  UPLOAD_STAGES,
  type ConversionCategory,
  type EditableFields,
  type UploadStage,
} from "@workspace/trpc/lib/agency/conversion-presets";

import { useAgency } from "@/components/agency/use-agency";

export type EditableAction = EditableFields & {
  resourceName: string;
  type: string;
  stage: UploadStage | null;
};

const NONE = "none";

const TYPE_ITEMS = [
  { value: "UPLOAD_CLICKS", label: "Reported by the Hub (import)" },
  { value: "AD_CALL", label: "Calls from ads" },
];
const CATEGORY_ITEMS = EDITABLE_CATEGORIES.map((value) => ({
  value,
  label: categoryLabel(value),
}));
const COUNT_ITEMS = [
  { value: "ONE_PER_CLICK", label: "One per click (leads)" },
  { value: "MANY_PER_CLICK", label: "Every conversion (sales)" },
];
const STAGE_ITEMS = [
  { value: NONE, label: "Not reported by the Hub" },
  ...UPLOAD_STAGES.map((value) => ({ value, label: STAGE_LABELS[value] })),
];

const EMPTY: EditableFields & { type: string; stage: UploadStage | null } = {
  name: "",
  type: "UPLOAD_CLICKS",
  category: "SUBMIT_LEAD_FORM",
  countingType: "ONE_PER_CLICK",
  clickThroughLookbackWindowDays: 90,
  primaryForGoal: true,
  defaultValue: 0,
  stage: null,
};

/** Create (no `action`) or edit a conversion action in the client's Google Ads account. */
export function ConversionDialog({
  open,
  onOpenChange,
  action,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: EditableAction | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();
  const [form, setForm] = useState(() =>
    action ? { ...action } : { ...EMPTY }
  );
  const set =
    <K extends keyof typeof form>(key: K) =>
    (value: (typeof form)[K]) =>
      setForm((current) => ({ ...current, [key]: value }));

  const onSuccess = (message: string) => () => {
    queryClient.invalidateQueries({
      queryKey: trpc.agency.ads.conversions.pathKey(),
    });
    toast.success(message);
    onOpenChange(false);
  };
  const onError = (error: { message: string }) => toast.error(error.message);
  const create = useMutation(
    trpc.agency.ads.conversions.create.mutationOptions({
      onSuccess: onSuccess("Conversion action created in Google Ads."),
      onError,
    })
  );
  const update = useMutation(
    trpc.agency.ads.conversions.update.mutationOptions({
      onSuccess: onSuccess("Conversion action updated."),
      onError,
    })
  );
  const pending = create.isPending || update.isPending;

  // Only import actions can be reported by the Hub.
  const canWire = form.type === "UPLOAD_CLICKS";
  const fields: EditableFields = {
    name: form.name.trim(),
    category: form.category,
    countingType: form.countingType,
    clickThroughLookbackWindowDays: form.clickThroughLookbackWindowDays,
    primaryForGoal: form.primaryForGoal,
    defaultValue: form.defaultValue,
  };

  const submit = () => {
    if (!fields.name) return toast.error("Give the action a name.");
    if (!action) {
      create.mutate({
        repoId,
        ...fields,
        type: form.type as "UPLOAD_CLICKS" | "AD_CALL",
        stage: canWire ? form.stage : null,
      });
      return;
    }
    const before: EditableFields = {
      name: action.name,
      category: action.category,
      countingType: action.countingType,
      clickThroughLookbackWindowDays: action.clickThroughLookbackWindowDays,
      primaryForGoal: action.primaryForGoal,
      defaultValue: action.defaultValue,
    };
    update.mutate({
      repoId,
      resourceName: action.resourceName,
      before,
      after: fields,
      ...(canWire && form.stage !== action.stage && { stage: form.stage }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {action ? "Edit conversion action" : "New conversion action"}
          </DialogTitle>
          <DialogDescription>
            {action
              ? "Changes are saved to Google Ads right away."
              : "Created in Google Ads right away. Website tag actions need code on the site, so set those up in Google Ads."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="conversion-action"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ca-name">Name</Label>
            <Input
              id="ca-name"
              value={form.name}
              maxLength={100}
              placeholder="Website lead"
              onChange={(event) => set("name")(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {!action && (
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  items={TYPE_ITEMS}
                  value={form.type}
                  onValueChange={(value) => {
                    set("type")(String(value));
                    if (value === "AD_CALL") set("category")("PHONE_CALL_LEAD");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select
                items={CATEGORY_ITEMS}
                value={form.category}
                onValueChange={(value) =>
                  set("category")(value as ConversionCategory)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Count</Label>
              <Select
                items={COUNT_ITEMS}
                value={form.countingType}
                onValueChange={(value) =>
                  set("countingType")(value as EditableFields["countingType"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNT_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca-window">Click-through window (days)</Label>
              <Input
                id="ca-window"
                type="number"
                min={1}
                max={90}
                value={form.clickThroughLookbackWindowDays}
                onChange={(event) =>
                  set("clickThroughLookbackWindowDays")(
                    Math.min(90, Math.max(1, Number(event.target.value) || 1))
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ca-value">Default value ($)</Label>
              <Input
                id="ca-value"
                type="number"
                min={0}
                step="any"
                value={form.defaultValue}
                onChange={(event) =>
                  set("defaultValue")(
                    Math.max(0, Number(event.target.value) || 0)
                  )
                }
              />
            </div>
          </div>

          {canWire && (
            <div className="space-y-1.5">
              <Label>The Hub reports this when</Label>
              <Select
                items={STAGE_ITEMS}
                value={form.stage ?? NONE}
                onValueChange={(value) =>
                  set("stage")(value === NONE ? null : (value as UploadStage))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-[12.5px]">
                Each stage reports to one action. Picking this one moves the
                stage here.
              </p>
            </div>
          )}

          <label className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <span>
              <span className="block text-[14px] font-medium">
                Primary action
              </span>
              <span className="text-muted-foreground block text-[12.5px]">
                Campaigns bid for primary actions. Secondary ones are only
                reported.
              </span>
            </span>
            <Switch
              checked={form.primaryForGoal}
              onCheckedChange={set("primaryForGoal")}
            />
          </label>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="conversion-action" disabled={pending}>
            {action ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
