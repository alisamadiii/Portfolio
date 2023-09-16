import { create } from "zustand";

interface User {
  currentUser: [] | null;
  setCurrentUser: (a: [] | null) => void;
}

const useUserStore = create<User>()((set) => ({
  currentUser: null,
  setCurrentUser: () => {},
}));
