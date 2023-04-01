import React, { ReactNode } from "react";

import { Navbar_Provider } from "@/context/Navbar_Context";
import Navbar from "@/components/Navbar";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <Navbar_Provider>
      <Navbar />
      <main>{children}</main>
      <footer>Footer</footer>
    </Navbar_Provider>
  );
}
