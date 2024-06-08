import { create } from "zustand";

interface directionTypes {
  direction: -1 | 1;
  setDirection: (a: -1 | 1) => void;
}

export const directionStore = create<directionTypes>((set) => ({
  direction: -1,
  setDirection: (a) => set({ direction: a }),
}));
