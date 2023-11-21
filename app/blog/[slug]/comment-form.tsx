"use client";

import Badge from "@/app/components/badge";
import { supabase } from "@/utils/supabase";
import React, { ChangeEvent, useState } from "react";
import Balancer from "react-wrap-balancer";

type Props = {
  slug: string;
};

export default function CommentForm({ slug }: Props) {
  const [inputField, setInputField] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmitHandler = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inputField.length === 0) return;

    setIsLoading(true);

    await supabase.from("blog-comments").insert({ comment: inputField, slug });

    setInputField("");
    setIsLoading(false);
  };

  return (
    <div className="mt-8 flex flex-col">
      <Balancer className="text-3xl font-bold">Comment</Balancer>
      <Badge className="mb-5">Public Beta</Badge>
      <form className="flex items-center gap-2" onSubmit={onSubmitHandler}>
        <input
          type="text"
          placeholder="comment"
          className="focus:shadow-input-focus grow rounded border border-border bg-transparent p-2 outline-none duration-100"
          value={inputField}
          onChange={(e) => setInputField(e.target.value)}
        />
        <button className="rounded bg-foreground px-4 py-2 text-background">
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
