import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { type Database } from "@/database.types";
import { ApproveButton, DeleteButton } from "./Button";

interface Props {
  data: Database["public"]["Tables"]["blog-comments"]["Row"];
}

export default function EachComment({ data }: Props) {
  const [inputField, setInputField] = useState("");

  const textareaRef = useRef<null | HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = "26px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputField]);

  return (
    <motion.li
      key={data.id}
      layout="position"
      className="mb-4 flex flex-col items-start justify-between gap-4 rounded-md border border-border bg-box p-4"
    >
      <div className="-space-y-2">
        <p className="whitespace-pre-wrap">{data.comment}</p>
        <small className="inline-block text-muted-3">{data.slug}</small>
      </div>
      <textarea
        ref={textareaRef}
        placeholder="reply now..."
        value={inputField}
        className="w-full resize-none rounded-md bg-white/10 p-2 outline-none placeholder:text-muted-2"
        onChange={(event) => setInputField(event.target.value)}
      />
      <div className="flex gap-2">
        <ApproveButton
          data={data}
          reply={inputField === "" ? null : inputField}
        />
        <DeleteButton id={data.id} />
      </div>
    </motion.li>
  );
}
