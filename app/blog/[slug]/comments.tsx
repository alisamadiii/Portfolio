"use client";

import { supabase } from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";

type Props = {
  slug: string;
};

export default function Comments({ slug }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["Comments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog-comments")
        .select("*")
        .eq("slug", slug)
        .eq("approve", true);

      return data || null;
    },
  });

  // useEffect(() => {
  //   if (data) {
  //     const channel = supabase
  //       .channel("realtime-message")
  //       .on(
  //         "postgres_changes",
  //         {
  //           event: "*",
  //           schema: "public",
  //           table: "blog-comments",
  //         },
  //         (payload) => {
  //           if (payload.eventType === "INSERT") {
  //             queryClient.setQueriesData<string[]>(
  //               // @ts-ignore
  //               ["Comments"],
  //               [...data, payload.new]
  //             );
  //           }
  //         }
  //       )
  //       .subscribe();

  //     return () => {
  //       supabase.removeChannel(channel);
  //     };
  //   }
  // }, [data]);

  if (!data) {
    return null;
  }

  console.log(data);

  return (
    <div className="mt-5">
      <ul>
        {data.map((d) => (
          <li key={d.id}>
            <p>{d.comment}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
