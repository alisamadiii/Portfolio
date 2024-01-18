import { create } from "zustand";

interface ImagePreview {
  image: string | null;
  setImage: (a: string | null) => void;
}

const useImagePreviewModal = create<ImagePreview>()((set) => ({
  image: null,
  setImage: (image) => set({ image }),
}));

export { useImagePreviewModal };
