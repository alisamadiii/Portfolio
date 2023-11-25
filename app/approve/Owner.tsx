import { supabase } from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { motion } from "framer-motion";

import { ApproveButton, DeleteButton } from "./Button";
import TextFormat from "../components/textFormat";
import SendEmail from "./SendEmail";

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
              <motion.li
                key={d.id}
                layoutId={d.id}
                className="flex items-start justify-between gap-4 border-b border-border py-2 last-of-type:border-none"
              >
                <div className="-space-y-2">
                  <TextFormat value={d.comment} />
                  <small className="inline-block text-muted-3">{d.slug}</small>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ApproveButton id={d.id} />
                  <DeleteButton id={d.id} />
                </div>
              </motion.li>
            ))}
          </ul>
        ))}

      <SendEmail />
    </div>
  );
}
