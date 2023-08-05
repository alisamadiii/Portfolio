import { UserTypes } from "@/types/User.t";
import React, { createContext, useEffect, useState } from "react";

type UserContextType = {
  currentUser: null | UserTypes | { name: string };
  setCurrentUser: any;
};

export const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
});

type UserProviderProps = {
  children: React.ReactNode;
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const [currentUser, setCurrentUser] = useState<
    null | UserTypes | { name: string }
  >(null);

  useEffect(() => {
    setTimeout(() => {
      setCurrentUser({ name: "Ali reza" });
    }, 3000);
  }, []);

  const value = { currentUser, setCurrentUser };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
