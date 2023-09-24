import { create } from "zustand";

import type { MessageValue } from "@/types/chat-history.t";

interface ChatStore {
  messages: MessageValue[];
  setMessages: (a: MessageValue[]) => void;
  replyId: string | number | null;
  setReplyId: (a: string | number | null) => void;
  uploadedImage: Blob[] | File[];
  setUploadedImage: (a: Blob[] | File[]) => void;
  uploadWay: 1 | 2;
  setUploadWay: (a: 1 | 2) => void;
}

const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  setMessages: (messages: MessageValue[]) => set({ messages }),
  replyId: null,
  setReplyId: (replyId: string | number | null) => set({ replyId }),
  uploadedImage: [],
  setUploadedImage: (uploadedImage: Blob[] | File[]) => set({ uploadedImage }),
  uploadWay: 1,
  setUploadWay: (uploadWay: 1 | 2) => set({ uploadWay }),
}));

export { useChatStore };
