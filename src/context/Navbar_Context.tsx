import { ReactNode, createContext, useState } from "react";

type NavbarContext = {
  isButton: boolean;
  setIsButton: (a: boolean) => void;
};

export const Navbar_Context = createContext<NavbarContext>({
  isButton: false,
  setIsButton: () => {},
});

type NavbarProps = {
  children: ReactNode;
};

export const Navbar_Provider = ({ children }: NavbarProps) => {
  const [isButton, setIsButton] = useState<boolean>(false);

  const value: NavbarContext = { isButton, setIsButton };
  return (
    <Navbar_Context.Provider value={value}>{children}</Navbar_Context.Provider>
  );
};
