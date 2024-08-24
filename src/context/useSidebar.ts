import { create } from "zustand";

interface useSidebarTypes {
  currentHeading: string | null;
  setCurrentHeading: (a: string | null) => void;
}

export const useSidebar = create<useSidebarTypes>((set) => ({
  currentHeading: null,
  setCurrentHeading: (value) => set({ currentHeading: value }),
}));
