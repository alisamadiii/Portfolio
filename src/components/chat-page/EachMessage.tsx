"use client";

import React, { useEffect, useState } from "react";

import type { MessageValue, SingleUser } from "@/types/chat-history.t";
import { UseUserContext } from "@/context/User.context";
import { Text } from "../ui/text";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { Copy, Pencil, Reply, Trash2 } from "lucide-react";
import { useToast } from "../ui/use-toast";
import { supabase } from "@/utils/supabase";
import { useChatStore } from "@/context/Chat.context";
import { Skeleton } from "../ui/skeleton";
import { Box } from "../ui/box";
import Image from "next/image";

type Props = {
  message: MessageValue;
};

export default function EachMessage({ message }: Props) {
  const [hoverData, setHoverData] = useState<{
    hover?: boolean;
    userData?: SingleUser | null;
  }>({ hover: false, userData: null });

  const { toast } = useToast();
  const { currentUser } = UseUserContext();
  const { setReplyId } = useChatStore();

  const { messages, setMessages } = useChatStore();

  const copyMessage = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied",
      description: `Message - ${value}`,
    });
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("chat-history").delete().eq("id", id);
    console.log("deleted");
  };

  const replyMessage = (id: string) => {
    setReplyId(id);
  };

  const mouseEnter = async () => {
    setHoverData({ hover: true });
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("provider_id", currentUser?.user.user_metadata.provider_id);

    setHoverData({ userData: data![0], hover: true });
  };

  const mouseLeave = () => {
    // setHoverData({ hover: false, userData: null });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={`relative w-auto min-w-message max-w-message border mb-2 p-2 rounded-lg ${
          currentUser?.user.user_metadata.provider_id == message.user_uid
            ? "bg-foreground text-background ml-auto rounded-tr-none"
            : "rounded-tl-none"
        }`}
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
      >
        {message.reply && (
          <Text
            size={10}
            className={`relative px-2 py-1 mb-2 overflow-hidden rounded-r select-none line-clamp-3 ${
              currentUser?.user.user_metadata.provider_id == message.user_uid
                ? "bg-accents-7"
                : "bg-accents-1"
            }`}
          >
            <span
              className={`absolute top-0 left-0 w-[1px] h-full ${
                currentUser?.user.user_metadata.provider_id == message.user_uid
                  ? "bg-background"
                  : "bg-foreground"
              }`}
            />
            {messages.find((m) => m.id == message.reply)?.message}
          </Text>
        )}
        <Text size={12} className="select-none">
          {message.message}
        </Text>
        {currentUser.user.user_metadata.provider_id !== message.user_uid &&
          hoverData.hover && (
            <div className="w-auto absolute right-0 translate-x-[calc(100%+8px)] bg-accents-1 -translate-y-1/2 top-1/2 p-1 rounded">
              {hoverData.userData ? (
                <div className="flex items-center gap-1">
                  <Image
                    src={hoverData.userData.avatar_url}
                    width={14}
                    height={14}
                    alt=""
                    className="rounded-full"
                  />
                  <div className="">
                    <Text className="text-[8px]">
                      {hoverData.userData.full_name}
                    </Text>
                    <Text className="text-[6px]">01:01pm</Text>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Skeleton className="w-3 h-3" />
                  <div className="space-y-1">
                    <Skeleton className="h-1 rounded-none w-9" />
                    <Skeleton className="w-6 h-1 rounded-none" />
                  </div>
                </div>
              )}
            </div>
          )}
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-accents-1">
        {currentUser?.user.user_metadata.provider_id == message.user_uid && (
          <>
            <ContextMenuItem
              className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white"
              onClick={() => deleteMessage(message.id)}
            >
              <Trash2 size={14} />
              Delete
            </ContextMenuItem>
            <ContextMenuItem className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white">
              <Pencil size={14} />
              Edit
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem
          className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white"
          onClick={() => replyMessage(message.id)}
        >
          <Reply size={14} /> Reply
        </ContextMenuItem>
        <ContextMenuItem
          className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white"
          onClick={() => copyMessage(message.message)}
        >
          <Copy size={14} /> Copy Text
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
