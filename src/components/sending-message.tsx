"use client";

import React, { useEffect, useState } from "react";

import { UseUserContext } from "@/context/User.context";
import { Label } from "@/components/ui/label";
import CustomIcon from "@/assets/CustomIcon";
import { supabase } from "@/utils/supabase";

import type { MessageValue } from "@/types/chat-history.t";

type Props = {
  setMessagesValue: (a: MessageValue[] | null) => void;
};

export default function SendingMessage({ setMessagesValue }: Props) {
  const [message, setMassage] = useState("");

  const { currentUser, setCurrentUser } = UseUserContext();

  console.log(currentUser);

  useEffect(() => {
    const textarea = document.querySelector("#message") as HTMLTextAreaElement;

    if (textarea) {
      textarea.addEventListener("keyup", (event: Event) => {
        textarea.style.height = "1rem";
        const target = event.target as HTMLTextAreaElement;
        textarea.style.height = `${target.scrollHeight}px`;
      });
    }
  }, []);

  const submittingMessage = async (e: any) => {
    e.preventDefault();

    if (message.length == 0) return;

    const data = await supabase.from("chat-history").insert([
      {
        user_uid: currentUser.user.user_metadata.provider_id,
        message,
      },
    ]);

    setMassage("");
  };

  return (
    <form
      onSubmit={submittingMessage}
      className="absolute bottom-0 left-0 flex items-center justify-between w-full gap-2 p-2 bg-background"
    >
      {/* Inputs */}
      <Label
        className={`flex items-center bg-accents-1 grow rounded-xl pl-2 pr-3 py-2`}
      >
        <textarea
          className="py-1 leading-5 bg-transparent outline-none resize-none grow placeholder:text-accents-6/50 max-h-20"
          rows={1}
          placeholder="your message"
          id="message"
          value={message}
          onChange={(e) => setMassage(e.target.value)}
        />
        <CustomIcon icon="photo" className="w-4 h-4 text-foreground" />
      </Label>
      {/* Send */}
      <button className="p-2 rounded-full bg-foreground text-background">
        <CustomIcon icon="send" />
      </button>
    </form>
  );
}
