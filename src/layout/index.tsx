import React, { ReactNode } from "react";

import { Navbar_Provider } from "@/context/Navbar_Context";
import Navbar from "@/components/Navbar";
import { User_Provider } from "@/context/User_Context";
import { useRouter } from "next/router";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const router = useRouter();

  if (router.pathname.includes("product")) {
    return (
      <div className="absolute inset-0 h-screen p-4 overflow-hidden md:p-8 before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary before:to-secondary before:scale-150 before:animate-spin-2">
        {children}
      </div>
    );
  } else {
    return (
      <User_Provider>
        <Navbar_Provider>
          {(router.asPath == "/" || router.pathname.includes("/service")) && (
            <Navbar />
          )}
          <main className="overflow-hidden">{children}</main>
          {router.asPath == "/" && (
            <footer className="absolute bottom-0 left-0 flex justify-center w-full py-4 text-sm -z-10">
              Designed & Developed by Ali Reza &#169; 2023;
            </footer>
          )}
        </Navbar_Provider>
      </User_Provider>
    );
  }
}
