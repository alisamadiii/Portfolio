"use client";

import React from "react";

import { supabase } from "@/utils/supabase";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  currentUser: any;
  setCurrentUser: (a: any) => void;
}

export const UserContext = createContext<User>({
  currentUser: null,
  setCurrentUser: () => {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState(null);

  const sendingUserData = async (session: any) => {
    if (!session) return;

    await supabase.from("users").upsert({
      provider_id: session.user.user_metadata.provider_id,
      full_name: session.user.user_metadata.full_name,
      avatar_url: session.user.user_metadata.avatar_url,
    });
  };

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session: any) => {
      setCurrentUser(session);
      sendingUserData(session);
    });
  }, []);

  const value = { currentUser, setCurrentUser };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export function UseUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("UseUserContext must be used within a User_Provider");
  }

  return context;
}
