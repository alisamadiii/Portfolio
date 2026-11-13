"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import type { AppId } from "@/lib/apps";
import { handleCmsError } from "@/lib/trpc-errors";

type Projects = RouterOutputs["cms"]["repos"]["listMine"];

/**
 * The apps a project shows in its sidebar, read from the listMine row the
 * project layout seeds. Installing writes optimistically into that cache (and
 * the editor snapshot, if loaded) so the sidebar updates without a reload.
 */
export function useInstalledApps(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listKey = trpc.cms.repos.listMine.queryKey();
  const snapshotKey = trpc.cms.repos.getSnapshot.queryKey({ projectId });

  const projects = useQuery(trpc.cms.repos.listMine.queryOptions());
  const row = projects.data?.find((p) => p.projectId === projectId);
  const installed = (row?.apps ?? []) as AppId[];

  const write = (apps: AppId[]) => {
    queryClient.setQueryData<Projects>(listKey, (old) =>
      old?.map((p) => (p.projectId === projectId ? { ...p, apps } : p))
    );
    queryClient.setQueryData<RouterOutputs["cms"]["repos"]["getSnapshot"]>(
      snapshotKey,
      (old) => (old ? { ...old, apps } : old)
    );
  };

  const setApps = useMutation(
    trpc.project.setApps.mutationOptions({
      onMutate: async ({ apps }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const prev = queryClient.getQueryData<Projects>(listKey);
        write(apps as AppId[]);
        return { prev };
      },
      onError: (error, _vars, ctx) => {
        if (ctx?.prev) queryClient.setQueryData(listKey, ctx.prev);
        toast.error(handleCmsError(error, "Couldn't update apps."));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: listKey });
        void queryClient.invalidateQueries({ queryKey: snapshotKey });
        // Adding Leads / Google Ads may create the agency row.
        void queryClient.invalidateQueries({
          queryKey: trpc.agency.project.queryKey({ projectId }),
        });
      },
    })
  );

  return {
    installed,
    /** Published to Netlify (upload projects): the sidebar shows the Netlify page. */
    netlify: !!row?.netlify,
    isLoaded: !!projects.data,
    isInstalled: (id: AppId) => installed.includes(id),
    /** `onSuccess` runs once the app is saved (e.g. open its page). */
    install: (id: AppId, opts?: { onSuccess?: () => void }) =>
      setApps.mutate({ projectId, apps: [...installed, id] }, { onSuccess: opts?.onSuccess }),
    uninstall: (id: AppId) =>
      setApps.mutate({ projectId, apps: installed.filter((a) => a !== id) }),
    isPending: setApps.isPending,
  };
}
