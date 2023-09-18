import React from "react";

import type { MessageValue } from "@/types/chat-history.t";
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

type Props = {
  messages: MessageValue[];
  setMessages: (a: MessageValue[]) => void;
  message: MessageValue;
};

export default function EachMessage({ messages, setMessages, message }: Props) {
  const { toast } = useToast();
  const { currentUser } = UseUserContext();

  const copyMessage = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: "Copied",
      description: `Message - ${value}`,
    });
  };

  const deleteMessage = async (id: string) => {
    const filterDeletedMessage = messages.filter(
      (message) => message.id !== id
    );

    setMessages(filterDeletedMessage);

    await supabase.from("chat-history").delete().eq("id", id);

    console.log("deleted");
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={`w-auto min-w-message max-w-message border mb-2 p-2 rounded-lg ${
          currentUser?.user.user_metadata.provider_id == message.user_uid
            ? "bg-foreground text-background ml-auto rounded-tr-none"
            : "rounded-tl-none"
        }`}
      >
        <Text size={12} className="select-none">
          {message.message}
        </Text>
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
        <ContextMenuItem className="flex items-center gap-2 text-xs duration-100 cursor-pointer text-accents-6 hover:bg-accents-2 hover:text-white">
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
