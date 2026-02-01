import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface SettingsState {
  containerScale: number;
  setContainerScale: (containerScale: number) => void;
  speed: number;
  setSpeed: (speed: number) => void;
}

export const useSettings = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        containerScale: 1,
        setContainerScale: (containerScale) => set({ containerScale }),
        speed: 1,
        setSpeed: (speed) => set({ speed }),
      }),
      {
        name: "motion-settings",
      }
    ),
    {
      name: "Settings",
    }
  )
);
