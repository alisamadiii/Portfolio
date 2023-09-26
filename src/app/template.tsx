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
          <Navbar />
        </>
      )}
      {children}
    </div>
  );
}
