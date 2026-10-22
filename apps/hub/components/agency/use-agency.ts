"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

export type AgencyClient = NonNullable<RouterOutputs["agency"]["me"]>;

/**
 * The signed-in agency client (agency.me). Only used inside the @agency slot,
 * which the (hub) layout renders after seeding this query (AgencySeed), so
 * the data is always there on the first render.
 */
export const useAgency = (): AgencyClient => {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.agency.me.queryOptions());
  if (!data) {
    throw new Error("useAgency is only available inside the agency UI.");
  }
  return data;
};
