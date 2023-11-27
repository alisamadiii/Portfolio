"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  slug: string;
}

export default function PageView({ slug }: Props) {
  const { data } = useQuery({
    queryKey: ["page_view"],
    queryFn: async () => {
      const res = await fetch(`/api/views/${slug}`, { method: "POST" });

      const data = await res.json();

      return data;
    },
  });

  console.log(data);

  return <></>;
}
