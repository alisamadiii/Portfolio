"use client";

import Checkbox from "@/app/components/checkbox";
import TextFormat from "@/app/components/textFormat";
import { formateDate, formateDateDistance } from "@/utils";
import { supabase } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, type Variants, motion } from "framer-motion";
import React, { useState } from "react";

interface Props {
  slug: string;
}

export default function Comments({ slug }: Props) {
  const [isShowTimeDistance, setIsShowTimeDistance] = useState(false);

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

  const timeAnimationVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
  };

  return (
    <div className="mt-8">
      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-2">
        <Checkbox
          checked={isShowTimeDistance}
          onChange={(event) => setIsShowTimeDistance(event.target.checked)}
        />
        Show Time Distance
      </label>
      <ul>
        {data.map((d) => (
          <li
            key={d.id}
            className="flex flex-col border-b border-border px-3 py-4 even:bg-box/30"
          >
            <TextFormat value={d.comment} />
            <div className="relative mt-2 flex h-5 w-full items-center justify-end text-right text-muted">
              <AnimatePresence initial={false}>
                {isShowTimeDistance ? (
                  <motion.small
                    variants={timeAnimationVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ type: "tween", ease: "backOut" }}
                    key="distance"
                    className="absolute inline-block"
                  >
                    {formateDateDistance(d.created_at)}
                  </motion.small>
                ) : (
                  <motion.small
                    variants={timeAnimationVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ type: "tween", ease: "backOut" }}
                    key="formate"
                    className="absolute inline-block"
                  >
                    {formateDate(d.created_at)}
                  </motion.small>
                )}
              </AnimatePresence>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
