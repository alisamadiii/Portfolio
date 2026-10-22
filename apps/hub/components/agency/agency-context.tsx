"use client";

import { createContext, useContext } from "react";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { ConfigProvider } from "@/contexts/config-context";

export type AgencyClient = NonNullable<RouterOutputs["agency"]["me"]>;

const AgencyContext = createContext<AgencyClient | null>(null);

export const useAgency = () => {
  const context = useContext(AgencyContext);
  if (!context) {
    throw new Error("useAgency must be used within an AgencyProvider");
  }
  return context;
};

// Agency clients have exactly one website. The ConfigProvider carries its
// coordinates so the website panels (analytics, emails) work here unchanged.
export const AgencyProvider = ({
  client,
  children,
}: {
  client: AgencyClient;
  children: React.ReactNode;
}) => (
  <AgencyContext.Provider value={client}>
    <ConfigProvider
      value={{
        owner: client.owner.toLowerCase(),
        repo: client.repo.toLowerCase(),
        repoId: client.repoId,
        branch: "",
        sha: "",
        version: "",
        object: {},
      }}
    >
      {children}
    </ConfigProvider>
  </AgencyContext.Provider>
);
