"use client";

import React, { useEffect, useState } from "react";
import Badge from "../components/badge";
import { supabase } from "@/utils/supabase";

type Props = {};

export default function ClientBadge({}: Props) {
  const [isShow, setIsShow] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      const { data: client } = await supabase
        .from("client")
        .select("client")
        .eq("id", 1)
        .single();

      if (!client) return;

      setIsShow(client.client);
    };
    fetchClient();
  }, []);

  return isShow ? (
    <Badge className="mb-4 flex items-center gap-2 px-4">
      <div className="relative h-2 w-2 rounded-full bg-blue-700 before:absolute before:h-full before:w-full before:animate-badge-circle-expand before:rounded-full before:bg-blue-700" />
      Currently having a Client
    </Badge>
  ) : (
    <Badge className="mb-4 flex items-center gap-2 px-4">
      <div className="relative h-2 w-2 rounded-full bg-green-700 before:absolute before:h-full before:w-full before:animate-badge-circle-expand before:rounded-full before:bg-green-700" />
      I can work on your project now!
    </Badge>
  );
}
