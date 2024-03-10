import LinkMetadata from "@/app/components/LinkMetadata";
import React, { type ChangeEvent, useState } from "react";

export default function GenerateMetadata() {
  const [input, setInput] = useState("");

  const onChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  return (
    <div className="flex max-w-2xl flex-col items-center gap-4">
      <input
        type="text"
        placeholder="Add your link..."
        className="rounded-md border p-1 outline-none duration-100 focus:border-black"
        onChange={onChangeHandler}
      />
      <LinkMetadata link={input} className="hover:bg-slate-200" />
    </div>
  );
}
