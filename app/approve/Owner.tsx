import { supabase } from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";
import EachComment from "./EachComment";
import Link from "next/link";

export default function Owner() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["comments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog-comments")
        .select("*")
        .eq("approve", false);

      return data ?? null;
    },
  });

  useEffect(() => {
    if (data) {
      const channel = supabase
        .channel("realtime-message")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "blog-comments",
          },
          (payload) => {
            /* eslint-disable */
            if (payload.eventType === "UPDATE") {
              const updatedData = data.filter(
                (message) => message.id !== payload.old.id
              );
              // esl
              // @ts-ignore
              queryClient.setQueriesData(["Comments"], updatedData);
            } else if (payload.eventType === "DELETE") {
              const deletedData = data.filter((d) => d.id !== payload.old.id);
              // @ts-ignore
              queryClient.setQueriesData(["Comments"], deletedData);
            }
          }
          /* eslint-enable */
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [data]);

  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold">Approve Now, Sir!</h1>

      {data &&
        (data.length === 0 ? (
          <h2 className="mb-5">No Comments</h2>
        ) : (
          <ul>
            {data.map((d) => (
              <EachComment key={d.id} data={d} />
            ))}
          </ul>
        ))}

      <Link
        href={"/approve/newsletter"}
        className="mt-8 inline-block w-full rounded-md bg-box p-4 hover:bg-opacity-80"
      >
        Newsletter
      </Link>
    </div>
  );
}
