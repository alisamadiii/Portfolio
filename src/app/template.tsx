"use client";

import React, { ReactNode, useEffect } from "react";

import Navbar from "@/components/navbar";
import { usePathname } from "next/navigation";
import { supabase } from "@/utils/supabase";

type Props = {
  children: ReactNode;
};

export default function Template({ children }: Props) {
  const pathName = usePathname();

  useEffect(() => {
    const fetchingUserData = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("provider_id");
    };
    const storingUserData = async () => {
      const { data } = await supabase.from("users").insert([
        {
          full_name: "Ali Reza",
        },
      ]);
    };

    // storingUserData();
  }, []);

  return (
    <div>
      {pathName !== "/login" && (
        <>
          <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full top-1/2 w-96 h-96 bg-foreground/5 blur-[100px] -z-50" />
          <Navbar />
        </>
      )}
      {children}
    </div>
  );
}
