import { create } from "zustand";

export type Levels = "level 1" | "level 2" | "level 3" | "level 4";

interface ContactType {
  level: Levels;
  setLevel: (a: Levels) => void;
  name: string;
  setName: (a: string) => void;
  email: string;
  setEmail: (a: string) => void;
  page: number;
  setPage: (a: number) => void;
  design: {
    url?: string;
    files?: File[];
  };
  setDesign: (a: { url?: string; files?: File[] }) => void;
  isDelete: boolean;
  setIsDelete: (a: boolean) => void;
}

const useContactStore = create<ContactType>()((set) => ({
  level: "level 1",
  setLevel: (level: Levels) => set({ level }),
  name: "",
  setName: (name: string) => set({ name }),
  email: "",
  setEmail: (email: string) => set({ email }),
  page: 1,
  setPage: (page: number) => set({ page }),
  design: { url: "", files: [] },
  setDesign: (design: { url?: string; files?: File[] }) => set({ design }),
  isDelete: false,
  setIsDelete: (isDelete: boolean) => set({ isDelete }),
}));

export { useContactStore };
