import { create } from "zustand";

export type Levels = "level 1" | "level 2" | "level 3" | "level 4";

interface ContactType {
  level: Levels;
  setLevel: (a: Levels) => void;
}

const useContactStore = create<ContactType>()((set) => ({
  level: "level 1",
  setLevel: (level: Levels) => set({ level }),
}));

export { useContactStore };
