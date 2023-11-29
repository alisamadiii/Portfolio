"use client";

import React from "react";
import Badge from "../components/badge";
import { supabase } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../components/skeleton";

export default function ClientBadge() {
  const { data, isLoading } = useQuery({
    queryKey: ["job"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client")
        .select("client")
        .eq("id", 1)
        .single();

      return data ?? null;
    },
  });

  if (isLoading) {
    return <Skeleton className="mb-4 mt-3 h-3 w-44 rounded-full" />;
  }

  return data?.client ? (
    <Badge className="relative mb-4 flex items-center gap-2 px-4">
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
