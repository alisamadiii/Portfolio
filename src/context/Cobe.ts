import { create } from "zustand";

export type MarkersType = { location: [number, number]; size: number };

interface CobeStoreTypes {
  markers: MarkersType[];
  setMarkers: (a: MarkersType[]) => void;
}

export const useCobeStore = create<CobeStoreTypes>()((set) => ({
  markers: [
    { location: [36.286209, 59.5998], size: 0.1 },
    { location: [-5.147665, 119.432732], size: 0.1 },
    { location: [34.555347, 69.207489], size: 0.1 },
  ],
  setMarkers: (markers: MarkersType[]) => set({ markers }),
}));
