"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { useTRPC } from "@workspace/trpc/client";

import {
  userMetadataKeys,
  type UserMetadata,
  type UserMetadataKey,
} from "@workspace/drizzle/schema";

type Entry = { key: UserMetadataKey | ""; value: string };

export const MetadataEditor = ({
  userId,
  initialMetadata,
  invalidateQueryKey,
}: {
  userId: string;
  initialMetadata: UserMetadata;
  invalidateQueryKey?: unknown[];
}) => {
  const [entries, setEntries] = useState<Entry[]>(() =>
    Object.entries(initialMetadata).map(([key, value]) => ({
      key: key as UserMetadataKey,
      value: String(value),
    }))
  );

  useEffect(() => {
    setEntries(
      Object.entries(initialMetadata).map(([key, value]) => ({
        key: key as UserMetadataKey,
        value: String(value),
      }))
    );
  }, [initialMetadata]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMetadata = useMutation(
    trpc.users.updateMetadata.mutationOptions({
      onSuccess: () => {
        if (invalidateQueryKey) {
          queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
        }
        toast.success("Custom fields saved");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const usedKeys = useMemo(
    () => new Set(entries.map((e) => e.key).filter(Boolean)),
    [entries]
  );

  const availableKeys = useMemo(
    () => userMetadataKeys.filter((k) => !usedKeys.has(k.key)),
    [usedKeys]
  );

  const addField = () => {
    setEntries((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeField = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateKey = (index: number, newKey: UserMetadataKey) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, key: newKey } : entry))
    );
  };

  const updateValue = (index: number, val: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, value: val } : entry))
    );
  };

  const save = () => {
    const metadata: Record<string, string> = {};
    for (const entry of entries) {
      if (entry.key) {
        metadata[entry.key] = entry.value;
      }
    }
    updateMetadata.mutate({ userId, metadata });
  };

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Custom Fields">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={addField}
          disabled={availableKeys.length === 0 && entries.every((e) => e.key)}
        >
          <Plus className="size-3.5" />
          Add Field
        </Button>
      </CardAgency.Header>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No custom fields yet. Click "Add Field" to get started.
        </p>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry, index) => {
            const keyOptions = userMetadataKeys.filter(
              (k) => k.key === entry.key || !usedKeys.has(k.key)
            );

            return (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={entry.key || undefined}
                  onValueChange={(v) => updateKey(index, v as UserMetadataKey)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {keyOptions.map((k) => (
                      <SelectItem key={k.key} value={k.key}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={entry.value}
                  onChange={(e) => updateValue(index, e.target.value)}
                  className="flex-[2]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeField(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Button
        className="w-fit gap-2"
        size={"lg"}
        onClick={save}
        isLoading={updateMetadata.isPending}
      >
        <Save className="size-4" />
        Save Changes
      </Button>
    </CardAgency.Card>
  );
};
