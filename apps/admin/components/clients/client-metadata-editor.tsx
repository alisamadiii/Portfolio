"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { CardAgency } from "@workspace/ui/agency/card-agency";

import { useTRPC } from "@workspace/trpc/client";

type Entry = { key: string; value: string };

export const ClientMetadataEditor = ({
  userId,
  initialMetadata,
}: {
  userId: string;
  initialMetadata: Record<string, string>;
}) => {
  const [entries, setEntries] = useState<Entry[]>(() =>
    Object.entries(initialMetadata).map(([key, value]) => ({
      key,
      value: String(value),
    }))
  );

  // Sync when initialMetadata changes (e.g. after refetch)
  useEffect(() => {
    setEntries(
      Object.entries(initialMetadata).map(([key, value]) => ({
        key,
        value: String(value),
      }))
    );
  }, [initialMetadata]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMetadata = useMutation(
    trpc.users.updateMetadata.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.users.getClientDetail.queryKey(userId),
        });
        toast.success("Custom fields saved");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const addField = () => {
    setEntries((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeField = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: val } : entry
      )
    );
  };

  const save = () => {
    const metadata: Record<string, string> = {};
    for (const entry of entries) {
      const key = entry.key.trim();
      if (key) {
        metadata[key] = entry.value;
      }
    }
    updateMetadata.mutate({ userId, metadata });
  };

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Custom Fields">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={addField}>
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
          {entries.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Key"
                value={entry.key}
                onChange={(e) => updateEntry(index, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={entry.value}
                onChange={(e) => updateEntry(index, "value", e.target.value)}
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
          ))}
        </div>
      )}

      <Button
        className="w-full gap-2"
        onClick={save}
        isLoading={updateMetadata.isPending}
      >
        <Save className="size-4" />
        Save Changes
      </Button>
    </CardAgency.Card>
  );
};
