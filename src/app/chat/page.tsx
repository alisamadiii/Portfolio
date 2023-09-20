"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

import CustomIcon from "@/assets/CustomIcon";
import { UseUserContext } from "@/context/User.context";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { UserInformationPopup } from "@/lib/animation";
import { signout, supabase } from "@/utils/supabase";
import { RotatingLines } from "react-loader-spinner";
import SendingMessage from "@/components/chat-page/sending-message";
import EachMessage from "@/components/chat-page/EachMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { Box } from "@/components/ui/box";
import { useChatStore } from "@/context/Chat.context";

type Props = {};

export default function Chat({}: Props) {
  const [isUserInformation, setIsUserInformation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser } = UseUserContext();
  const { messages, setMessages, replyId } = useChatStore();

  const signOutHandler = async () => {
    setIsLoading(true);
    await signout();
    setCurrentUser(null);
    setIsLoading(false);
  };

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

  useEffect(() => {
    const gettingAllMessage = async () => {
      const { data, error } = await supabase
        .from("chat-history")
        .select("id, message, user_uid");

      setMessages(data!);
    };

    gettingAllMessage();
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll to the bottom of the container
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, replyId]);

  return (
    <div className="grid w-full h-dvh place-items-center">
      <div className="relative flex flex-col w-full max-w-sm overflow-hidden border rounded-lg h-chat">
        <header className="relative z-10 flex items-center justify-between w-full px-4 py-2 bg-black border-b">
          <Avatar className="w-auto h-auto">
            <AvatarImage src="/logo.png" alt="logo" className="w-6 h-6" id="" />
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <div className="relative">
            <span
              className="cursor-pointer"
              onClick={() => setIsUserInformation(!isUserInformation)}
            >
              <CustomIcon icon="3-dots" />
            </span>
            {isUserInformation &&
              (currentUser ? (
                <motion.div
                  variants={UserInformationPopup}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="absolute right-0 w-40 p-2 space-y-3 translate-y-6 border rounded-xl bg-accents-1"
                >
                  {/* Name & Gmail */}
                  <div>
                    <Text size={12} className="text-foreground">
                      {currentUser?.user.user_metadata.full_name}
                    </Text>
                    <Text size={10}>{currentUser?.user.email}</Text>
                  </div>
                  {/* Signed with */}
                  <div className="flex items-center gap-2">
                    <Text size={12} className="text-foreground">
                      Signed in
                    </Text>
                    <Badge>{currentUser?.user.app_metadata.provider}</Badge>
                  </div>
                  {/* Sign out */}
                  <Button
                    variant={"error"}
                    className="w-full h-6 text-xxs"
                    onClick={signOutHandler}
                  >
                    {isLoading && (
                      <RotatingLines
                        strokeColor="black"
                        strokeWidth="3"
                        animationDuration="1"
                        width="14"
                        visible={true}
                      />
                    )}
                    Sign out
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  variants={UserInformationPopup}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="absolute right-0 w-40 p-2 space-y-3 translate-y-6 border rounded-xl bg-accents-1"
                >
                  {/* Sign out */}
                  <Link
                    href={"/login"}
                    className={buttonVariants({
                      className: "w-full h-6 text-xxs",
                    })}
                    onClick={signOutHandler}
                  >
                    Sign in
                  </Link>
                </motion.div>
              ))}
          </div>
        </header>

        {/* Messages */}
        <div
          className="relative flex flex-col items-start w-full h-full px-4 py-2 overflow-auto custom-scrollbar bg-background"
          ref={containerRef}
        >
          {messages?.length !== 0 ? (
            messages?.map((message) => (
              <EachMessage key={message.id} message={message} />
            ))
          ) : (
            <Box className="h-full mt-3 space-y-2 border-none rounded-none">
              <Skeleton className="w-1/2 h-6" />
              <Skeleton className="w-1/3 h-6" />
              <Skeleton className="w-1/2 h-6" />
              <Skeleton className="w-1/3 h-6" />
              <Skeleton className="w-1/2 h-6 ml-auto" />
              <Skeleton className="w-1/3 h-6 ml-auto" />
              <Skeleton className="w-1/2 h-6" />
              <Skeleton className="w-1/3 h-6" />
              <Skeleton className="w-1/2 h-6 ml-auto" />
              <Skeleton className="w-1/3 h-6 ml-auto" />
              <Skeleton className="w-1/2 h-6" />
              <Skeleton className="w-1/3 h-6" />
            </Box>
          )}
        </div>

        {currentUser && <SendingMessage />}
      </div>
    </div>
  );
}
