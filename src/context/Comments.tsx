import { create } from "zustand";

import { COMMENTS } from "@/Types/User";

interface CommentStore {
  comments: COMMENTS;
  setComments: (state: []) => void;
}

export const useCommentsStore = create<CommentStore>()((set) => ({
  comments: [],
  setComments: (comments: []) => set({ comments }),
}));
