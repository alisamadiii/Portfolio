import { create } from "zustand";

interface CodeEditorState {
  fileExpanded: boolean;
  mediaExpanded: boolean;
  newFile: string;
  showNewFile: boolean;
  selectedTab: string | "media" | null;

  // Actions
  setFileExpanded: (fileExpanded: boolean) => void;
  setMediaExpanded: (mediaExpanded: boolean) => void;
  setNewFile: (filename: string) => void;
  setShowNewFile: (showNewFile: boolean) => void;
  setSelectedTab: (selectedTab: string | "media" | null) => void;
  resetNewFile: () => void;
}

export const useCodeEditor = create<CodeEditorState>((set) => ({
  // Initial state
  fileExpanded: true,
  mediaExpanded: true,
  newFile: "",
  showNewFile: false,
  selectedTab: null,

  // Actions
  setFileExpanded: (fileExpanded) => set({ fileExpanded }),
  setMediaExpanded: (mediaExpanded) => set({ mediaExpanded }),
  setNewFile: (filename) => set({ newFile: filename }),
  setShowNewFile: (showNewFile) => set({ showNewFile }),
  setSelectedTab: (selectedTab) => set({ selectedTab }),

  resetNewFile: () => set({ newFile: "", showNewFile: false }),
}));
