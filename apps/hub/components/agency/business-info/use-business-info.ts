"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

import { useAgency } from "@/components/agency/use-agency";

export type Draft = Record<string, string[]>;

/**
 * Shared data layer for the Business Info step pages: the saved map, an
 * editable draft for this step's keys (seeded with `initial` empty rows),
 * row helpers, and a save that sends the FULL merged map (the router's set
 * replaces the whole jsonb, so other steps' values ride along).
 */
export function useBusinessInfo(keys: { key: string; initial: number }[]) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { projectId } = useAgency();

  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ projectId }));
  const [draft, setDraft] = useState<Draft>({});
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!info.data) return;
    const seeded: Draft = {};
    for (const { key, initial } of keys) {
      const rows = info.data[key] ?? [];
      seeded[key] =
        rows.length >= initial
          ? [...rows]
          : [...rows, ...Array.from({ length: initial - rows.length }, () => "")];
    }
    setDraft(seeded);
    setDirty(false);
    // keys is a per-page constant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.data]);

  const save = useMutation(
    trpc.agency.businessInfo.set.mutationOptions({
      onSuccess: () => {
        setSavedAt(new Date());
        setDirty(false);
        queryClient.invalidateQueries({
          queryKey: trpc.agency.businessInfo.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // Other steps' saved values + this step's live edits: prompts and
  // cross-step lookups read through this.
  const values = useMemo(
    () => ({ ...(info.data ?? {}), ...draft }),
    [info.data, draft]
  );

  const setRow = (key: string, i: number, value: string) => {
    setDraft((prev) => {
      const rows = [...(prev[key] ?? [])];
      while (rows.length <= i) rows.push("");
      rows[i] = value;
      return { ...prev, [key]: rows };
    });
    setDirty(true);
  };
  const addRow = (key: string) => {
    setDraft((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ""] }));
    setDirty(true);
  };
  const removeRow = (key: string, i: number) => {
    setDraft((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, j) => j !== i),
    }));
    setDirty(true);
  };
  /** Remove index i from several aligned arrays at once (segment cards). */
  const removeAcross = (rowKeys: string[], i: number) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const key of rowKeys)
        next[key] = (prev[key] ?? []).filter((_, j) => j !== i);
      return next;
    });
    setDirty(true);
  };

  const saveAnd = async (to?: string) => {
    try {
      await save.mutateAsync({ projectId, businessInfo: values });
      if (to) router.push(to);
    } catch {
      // onError already toasted; stay on the page.
    }
  };

  return {
    projectId,
    info,
    draft,
    setDraft: (next: Draft) => {
      setDraft(next);
      setDirty(true);
    },
    values,
    dirty,
    saving: save.isPending,
    savedAt,
    setRow,
    addRow,
    removeRow,
    removeAcross,
    saveAnd,
  };
}
