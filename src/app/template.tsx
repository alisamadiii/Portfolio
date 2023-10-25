"use client";

import React, { useState, type ReactNode, useEffect } from "react";

import Navbar from "@/components/navbar";
import { usePathname } from "next/navigation";

interface Props {
  children: ReactNode;
}

export default function Template({ children }: Props) {
  const pathName = usePathname();
  const [isNavbar, setIsNavbar] = useState(false);

  useEffect(() => {
    isNavbar
      ? (document.body.style.overflow = "hidden")
      : (document.body.style.overflow = "");
  }, [isNavbar]);

  return (
    <div>
      {pathName !== "/login" && (
        <>
          <Navbar isNavbar={isNavbar} setIsNavbar={setIsNavbar} />
        </>
      )}
      <main className={`duration-200 ${isNavbar ? "opacity-5" : ""}`}>
        {children}
      </main>
    </div>
  );
}
