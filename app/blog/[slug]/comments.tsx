"use client";

import TextFormat from "@/app/components/textFormat";
import { supabase } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";
import React from "react";

interface Props {
  slug: string;
}

export default function Comments({ slug }: Props) {
  const { data } = useQuery({
    queryKey: ["Comments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog-comments")
        .select("*")
        .eq("slug", slug)
        .eq("approve", true);

      return data ?? null;
    },
  });

  if (!data) {
    return null;
  }

  return (
    <div className="mt-5">
      <ul>
        {data.map((d) => (
          <li
            key={d.id}
            className="border-b border-border px-3 py-4 even:bg-box/30"
          >
            <TextFormat value={d.comment} />
          </li>
        ))}
      </ul>
    </div>
  );
}
