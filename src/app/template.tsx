"use client";

import React, { type ReactNode } from "react";

import Navbar from "@/components/navbar";
import { usePathname } from "next/navigation";

interface Props {
  children: ReactNode;
}

export default function Template({ children }: Props) {
  const pathName = usePathname();
  return (
    <div>
      {pathName !== "/login" && (
        <>
          <Navbar />
        </>
      )}
      {children}
    </div>
  );
}
