import { COMMENT } from "@/Types/User";
import { create } from "zustand";

interface replyStore {
  replyComment: null | COMMENT;
  setReplyComment: (state: COMMENT | null) => void;
}

export const useReplyStore = create<replyStore>()((set) => ({
  replyComment: null,
  setReplyComment: (replyComment: COMMENT | null) => set({ replyComment }),
}));
