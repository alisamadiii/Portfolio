import { CURRENT_USER_TYPE } from "@/Types/User";
import { ReactNode, createContext, useState } from "react";

type UserContext = {
  currentUser: null | CURRENT_USER_TYPE;
  setCurrentUser: (a: {}) => void;
};

export const User_Context = createContext<UserContext>({
  currentUser: null,
  setCurrentUser: () => {},
});

type UserProps = {
  children: ReactNode;
};

export const User_Provider = ({ children }: UserProps) => {
  const [currentUser, setCurrentUser] = useState<null | CURRENT_USER_TYPE>(
    null
  );

  const value: UserContext = { currentUser, setCurrentUser };
  return (
    <User_Context.Provider value={value}>{children}</User_Context.Provider>
  );
};
