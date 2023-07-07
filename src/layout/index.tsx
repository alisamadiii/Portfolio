import React, { ReactNode } from "react";

import { Navbar_Provider } from "@/context/Navbar_Context";
import { User_Provider } from "@/context/User_Context";
import { useRouter } from "next/router";

import Navbar from "@/components/Navbar";
import Container from "./Container";

type Props = {
  children: ReactNode;
};

import { SiNextdotjs, SiTailwindcss } from "react-icons/si";
import { TbBrandFramerMotion } from "react-icons/tb";
import { SiJest } from "react-icons/si";

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
          {router.pathname.includes("/chat-community") ? <></> : <Navbar />}
          <main className="overflow-hidden">{children}</main>
          {router.pathname.includes("/chat-community") ? (
            <></>
          ) : (
            <footer className="absolute bottom-0 left-0 w-full text-sm border-t-2 py-7">
              <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
                <div className="flex items-center gap-4 md:text-xl">
                  <p>Made by: </p>
                  <div className="flex items-center gap-4 text-3xl">
                    <SiNextdotjs />
                    <SiTailwindcss />
                    <TbBrandFramerMotion />
                    <SiJest />
                  </div>
                </div>
                Designed & Developed by Ali Reza &#169; 2023;
              </Container>
            </footer>
          )}
        </Navbar_Provider>
      </User_Provider>
    );
  }
}
