import { create } from "zustand";

interface ElementsOpening {
  currentOpen: string | null;
  setCurrentOpen: (value: string | null) => void;
}

export const useElementsOpening = create<ElementsOpening>((set) => ({
  currentOpen: null,
  setCurrentOpen: (value) => set({ currentOpen: value }),
}));
