"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button, IconButton } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Input } from "@/components/ds/ui/field";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/use-agency";
import { Plus, Trash } from "@/components/icon";

export function OriginsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useAgency();

  const origins = useQuery(trpc.agency.origins.get.queryOptions({ projectId }));
  const [rows, setRows] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  // Seed the editable list once the saved origins load.
  useEffect(() => {
    if (origins.data) setRows(origins.data.length ? origins.data : [""]);
  }, [origins.data]);

  const save = useMutation(
    trpc.agency.origins.set.mutationOptions({
      onSuccess: (saved) => {
        toast.success("Allowed domains saved.");
        setRows(saved.length ? saved : [""]);
        setDirty(false);
        queryClient.invalidateQueries({ queryKey: trpc.agency.origins.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  if (origins.isPending) return <Skeleton className="h-64 w-full rounded-card" />;
  if (origins.error) return <p className="text-sm text-danger">{origins.error.message}</p>;

  const set = (i: number, value: string) => {
    setRows((prev) => prev.map((r, j) => (j === i ? value : r)));
    setDirty(true);
  };
  const remove = (i: number) => {
    setRows((prev) => prev.filter((_, j) => j !== i));
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader title="Allowed domains" divided />
      <div className="flex flex-col gap-4 px-6 py-5">
      <p className="text-[13px] text-dim">
        Your lead form only works on the domains listed here. Add every site you
        put the script on (for example <code>yourbusiness.com</code>). The www
        version is covered automatically.
      </p>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={row}
              placeholder="yourbusiness.com"
              className="max-w-sm"
              onChange={(e) => set(i, e.target.value)}
            />
            {rows.length > 1 && (
              <IconButton aria-label={`Remove domain ${i + 1}`} className="size-8" onClick={() => remove(i)}>
                <Trash className="size-3.5" />
              </IconButton>
            )}
          </div>
        ))}
        <Button
          variant="subtle"
          size="sm"
          icon={<Plus className="size-3.5" />}
          onClick={() => {
            setRows((prev) => [...prev, ""]);
            setDirty(true);
          }}
        >
          Add domain
        </Button>
      </div>

      <Button
        variant="primary"
        className="self-start"
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate({ projectId, origins: rows })}
      >
        {save.isPending ? "Saving…" : "Save domains"}
      </Button>
      </div>
    </Card>
  );
}
