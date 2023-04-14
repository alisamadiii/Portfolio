import React, { ReactNode } from "react";

import { Navbar_Provider } from "@/context/Navbar_Context";
import Navbar from "@/components/Navbar";
import { User_Provider } from "@/context/User_Context";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <User_Provider>
      <Navbar_Provider>
        <Navbar />
        <main className="overflow-hidden">{children}</main>
        <footer className="absolute bottom-0 left-0 flex justify-center w-full py-4 text-sm -z-10">
          Designed & Developed by Ali Reza &#169; 2023;
        </footer>
      </Navbar_Provider>
    </User_Provider>
  );
}
