"use client";

import React, { useEffect, useState } from "react";
import useMeasure from "react-use-measure";
import { AnimatePresence, motion } from "framer-motion";

import { UseUserContext } from "@/context/User.context";
import { Label } from "@/components/ui/label";
import CustomIcon from "@/assets/CustomIcon";
import { supabase } from "@/utils/supabase";

import { useChatStore } from "@/context/Chat.context";
import { Text } from "../ui/text";

import { AiOutlineClose } from "react-icons/ai";

type Props = {};

export default function SendingMessage({}: Props) {
  const [message, setMassage] = useState("");
  const { messages, setMessages, replyId, setReplyId } = useChatStore();

  const [label, { height }] = useMeasure();

  const { currentUser } = UseUserContext();

  useEffect(() => {
    const textarea = document.querySelector("#message") as HTMLTextAreaElement;

    if (textarea) {
      textarea.style.height = "1rem";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);

  const submittingMessage = async (e: any) => {
    e.preventDefault();
    if (message.length == 0) return;

    const data = await supabase.from("chat-history").insert([
      {
        user_uid: currentUser.user.user_metadata.provider_id,
        message,
        reply: replyId,
      },
    ]);
  };

  useEffect(() => {
    const channel = supabase
      .channel("realtime-message")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat-history",
        },
        (payload: any) => {
          console.log(payload);
          if (payload.eventType == "INSERT") {
            setMessages([
              ...messages,
              {
                message: payload.new.message,
                user_uid: payload.new.user_uid,
                id: payload.new.id,
              },
            ]);
            setMassage("");
            setReplyId(null);
          } else if (payload.eventType == "DELETE") {
            const findMessage = messages.filter(
              (message) => message.id !== payload.old.id
            );

            setMessages(findMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, messages]);

  return (
    <form
      onSubmit={submittingMessage}
      className="flex items-center justify-between w-full gap-2 p-2 bg-background"
    >
      {/* Inputs */}
      <Label
        ref={label}
        className={`flex flex-col items-center bg-accents-1 grow rounded-xl pl-2 pr-3 py-2`}
      >
        <AnimatePresence>
          {replyId && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden"
              key={replyId}
            >
              <div className="bg-background px-2 py-0.5 rounded relative overflow-hidden mb-2 w-full">
                <div className="absolute top-0 left-0 w-[2px] h-full bg-white" />
                <Text
                  as="h3"
                  size={10}
                  className="tracking-widest !text-white text-xxs"
                >
                  Ali
                </Text>
                <Text size={10} className="leading-4 line-clamp-3">
                  {messages.find((message) => message.id == replyId)?.message}
                </Text>
                <span
                  className="absolute cursor-pointer text-xxs top-2 right-2"
                  onClick={() => setReplyId(null)}
                >
                  <AiOutlineClose />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center w-full">
          <textarea
            className="py-1 leading-5 bg-transparent outline-none resize-none grow placeholder:text-accents-6/50 max-h-20"
            rows={1}
            placeholder="your message"
            id="message"
            value={message}
            onChange={(e) => setMassage(e.target.value)}
          />
          <CustomIcon icon="photo" className="w-4 h-4 text-foreground" />
        </div>
      </Label>
      {/* Send */}
      <button className="p-2 rounded-full bg-foreground text-background">
        <CustomIcon icon="send" />
      </button>
    </form>
  );
}
