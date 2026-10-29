"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

import { Plus, Trash } from "@/components/icon";

/**
 * Site Settings › Domain › Allowed domains. The one origins allowlist for the
 * project (stored on hub_project, shared with the agency settings card): the
 * lead form / booking / contact scripts only run on the hosts listed here.
 */
export function OriginsCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const origins = useQuery(trpc.domains.origins.get.queryOptions({ projectId }));
  const [rows, setRows] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  // Seed the editable list once the saved origins load.
  useEffect(() => {
    if (origins.data) setRows(origins.data.length ? origins.data : [""]);
  }, [origins.data]);

  const save = useMutation(
    trpc.domains.origins.set.mutationOptions({
      onSuccess: (saved) => {
        toast.success("Allowed domains saved.");
        setRows(saved.length ? saved : [""]);
        setDirty(false);
        queryClient.invalidateQueries({
          queryKey: trpc.domains.origins.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const set = (i: number, value: string) => {
    setRows((prev) => prev.map((r, j) => (j === i ? value : r)));
    setDirty(true);
  };
  const remove = (i: number) => {
    setRows((prev) => prev.filter((_, j) => j !== i));
    setDirty(true);
  };

  return (
    <div className="bg-card rounded-lg border">
      <div className="border-b p-4">
        <h3 className="text-[16px] font-extrabold tracking-tight">
          Allowed domains
        </h3>
        <p className="text-muted-foreground mt-1 text-[13px]">
          Your lead form, booking and contact widgets only work on the domains
          listed here. Add every site you put the scripts on (for example{" "}
          <code>yourbusiness.com</code>, or <code>localhost</code> while
          testing). The www version is covered automatically.
        </p>
      </div>

      {origins.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      ) : origins.error ? (
        <p className="text-destructive p-4 text-[14px]">
          {origins.error.message}
        </p>
      ) : (
        <div className="space-y-3 p-4">
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(i)}
                  >
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
            isLoading={save.isPending}
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate({ projectId, origins: rows })}
          >
            Save domains
          </Button>
        </div>
      )}
    </div>
  );
}
