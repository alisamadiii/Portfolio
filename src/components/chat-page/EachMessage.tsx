"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
import Image from "next/image";
import { getLastNameRoute } from "@/utils";

// Icons
import {
  IoIosArrowDroprightCircle,
  IoIosArrowDropleftCircle,
} from "react-icons/io";

type Props = {
  message: MessageValue;
};

export default function EachMessage({ message }: Props) {
  const [userData, setUserData] = useState<SingleUser | null>(null);
  const [currentImage, setCurrentImage] = useState(0);

  const [deleted, setDeleted] = useState(false);

  const { toast } = useToast();
  const { currentUser } = UseUserContext();
  const { setReplyId } = useChatStore();

  const { messages } = useChatStore();

  const copyMessage = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied",
      description: `Message - ${value}`,
    });
  };

  const deleteMessage = async (id: string) => {
    setDeleted(true);

    await supabase.from("chat-history").delete().eq("id", id);

    if (message.files) {
      await supabase.storage
        .from("chat")
        .remove(
          message.files.map((file) =>
            getLastNameRoute(file).replaceAll("%20", " ")
          )
        );
    }
    console.log("deleted");
  };

  const replyMessage = (id: string) => {
    setReplyId(id);
  };

  const mouseEnter = async (userId: number) => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("provider_id", userId);

    setUserData(data![0]);
  };

  const mouseLeave = () => {
    // setHoverData({ hover: false, userData: null });
  };

  // Changing Image
  const changingImage = (action: "increase" | "decrease") => {
    if (action == "increase") {
      if (currentImage == message.files.length - 1) return;

      setCurrentImage(currentImage + 1);
    } else {
      if (currentImage == 0) return;

      setCurrentImage(currentImage - 1);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={`relative group w-auto min-w-message max-w-message border mb-2 p-2 rounded-lg transition-colors ${
          currentUser?.user.user_metadata.provider_id == message.user_uid
            ? "bg-foreground text-background ml-auto rounded-tr-none"
            : "rounded-tl-none"
        } ${deleted && "!bg-error text-white animate-pulse"}`}
        onMouseEnter={() => mouseEnter(message.user_uid)}
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
        {message.files && (
          <div className={`relative mb-2 overflow-hidden rounded w-[220px]`}>
            <div className="relative flex items-center bg-accents-6/20 aspect-square">
              <AnimatePresence initial={false}>
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween" }}
                  key={currentImage}
                  className="absolute w-full"
                >
                  <Image
                    src={message.files[currentImage]}
                    className="object-cover w-full pointer-events-none select-none"
                    width={300}
                    height={300}
                    alt=""
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            {message.files.length > 1 && (
              <>
                {currentImage !== 0 && (
                  <IoIosArrowDropleftCircle
                    className="absolute text-xl text-white -translate-y-1/2 shadow-lg cursor-pointer top-1/2 left-1"
                    onClick={() => changingImage("decrease")}
                  />
                )}
                {currentImage !== message.files.length - 1 && (
                  <IoIosArrowDroprightCircle
                    className="absolute text-xl text-white -translate-y-1/2 shadow-lg cursor-pointer top-1/2 right-1"
                    onClick={() => changingImage("increase")}
                  />
                )}
              </>
            )}
          </div>
        )}
        <Text size={12} className="select-none">
          {message.message}
        </Text>
        {currentUser?.user.user_metadata.provider_id !== message.user_uid && (
          <div className="w-20 absolute right-0 translate-x-[calc(100%+8px)] bg-accents-1 top-1/2 p-1 rounded opacity-0 group-hover:opacity-100 group-hover:-translate-y-1/2 duration-100">
            {userData ? (
              <div className="flex items-center gap-1">
                <Image
                  src={userData.avatar_url}
                  width={14}
                  height={14}
                  alt=""
                  className="rounded-full"
                />
                <div className="w-14">
                  <Text className="text-[8px] truncate">
                    {userData.full_name}
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
        {(currentUser?.user.user_metadata.provider_id == message.user_uid ||
          process.env.NEXT_PUBLIC_OWNER) && (
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
