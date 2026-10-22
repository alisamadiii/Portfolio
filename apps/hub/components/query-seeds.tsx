"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

// Server layouts already load these on every request (to redirect, pick a UI
// slot, or gate a project). The seeds hand that data to React Query, so the
// hooks reading it (useCurrentUser, useAgency, useRepo, useProject) have it on
// the first render: no loading flash, and later refetches or invalidations
// update every reader through the same cache. Each seed runs once, in a state
// initializer, before its children render.

/** users.getCurrent, from the (main) layout. */
export function SessionSeed({
  current,
  children,
}: {
  current: RouterOutputs["users"]["getCurrent"];
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryData(trpc.users.getCurrent.queryKey(), current);
  });
  return children;
}

/** agency.me, from the (hub) layout when it picks the agency UI. */
export function AgencySeed({
  agency,
  children,
}: {
  agency: NonNullable<RouterOutputs["agency"]["me"]>;
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryData(trpc.agency.me.queryKey(), agency);
  });
  return children;
}

/** cms.repos.getSnapshot({ repoId }), from the /p/[repoId] layout. */
export function ProjectSeed({
  repoId,
  snapshot,
  children,
}: {
  repoId: number;
  snapshot: RouterOutputs["cms"]["repos"]["getSnapshot"];
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryData(trpc.cms.repos.getSnapshot.queryKey({ repoId }), snapshot);
  });
  return children;
}
