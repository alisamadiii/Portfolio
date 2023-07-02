import { create } from "zustand";

interface PageStore {
  pageNum: number;
  setPageNum: (pageNum: number) => void;
}

export const usePageStore = create<PageStore>((set) => ({
  pageNum: 1,
  setPageNum: (pageNum: number) => set({ pageNum }),
}));
