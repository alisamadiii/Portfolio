import { create } from "zustand";
import { persist } from "zustand/middleware";

import { RouterOutputs } from "@workspace/trpc/routers/_app";

interface ClientWorkState {
  clientWork: RouterOutputs["admin"]["clientWork"]["get"][number]["from"];
  setClientWork: (
    clientWork: RouterOutputs["admin"]["clientWork"]["get"][number]["from"]
  ) => void;
  isPhone: boolean;
  setIsPhone: (isPhone: boolean) => void;
}

export const useClientWorkStore = create<ClientWorkState>()(
  persist(
    (set) => ({
      clientWork: "crosspost",
      setClientWork: (clientWork) => set({ clientWork }),
      isPhone: false,
      setIsPhone: (isPhone) => set({ isPhone }),
    }),
    { name: "client-work-storage" }
  )
);
