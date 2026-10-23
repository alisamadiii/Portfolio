"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/use-agency";
import { Globe, Plus, Trash } from "@/components/icon";

export function OriginsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();

  const origins = useQuery(trpc.agency.origins.get.queryOptions({ repoId }));
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

  if (origins.isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (origins.error)
    return <p className="text-destructive text-[14px]">{origins.error.message}</p>;

  const set = (i: number, value: string) => {
    setRows((prev) => prev.map((r, j) => (j === i ? value : r)));
    setDirty(true);
  };
  const remove = (i: number) => {
    setRows((prev) => prev.filter((_, j) => j !== i));
    setDirty(true);
  };

  return (
    <div className="bg-card space-y-5 rounded-2xl border p-5">
      <div className="flex items-start gap-3">
        <Globe className="text-muted-foreground mt-0.5 size-5" />
        <div>
          <p className="font-semibold">Allowed domains</p>
          <p className="text-muted-foreground mt-0.5 max-w-2xl text-[13.5px]">
            Your lead form and booking widget only work on the domains listed
            here. Add every site you put the scripts on (for example{" "}
            <code>yourbusiness.com</code>). The www version is covered
            automatically.
          </p>
        </div>
      </div>

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
              <Button variant="ghost" size="icon-sm" onClick={() => remove(i)}>
                <Trash className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRows((prev) => [...prev, ""]);
            setDirty(true);
          }}
        >
          <Plus className="size-4" /> Add domain
        </Button>
      </div>

      <Button
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate({ repoId, origins: rows })}
      >
        {save.isPending ? "Saving…" : "Save domains"}
      </Button>
    </div>
  );
}
