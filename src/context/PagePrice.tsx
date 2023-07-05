import { create } from "zustand";

interface pagePriceStore {
  pagePrice: number;
  setPagePrice: (price: number) => void;
}

export const usePagePriceStore = create<pagePriceStore>()((set) => ({
  pagePrice: 1,
  setPagePrice: (pagePrice: number) => set({ pagePrice }),
}));
