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
    const storingUserData = async () => {
      const { data } = await supabase.from("users").select("*");

      const findingExistedUser = data?.find(
        (user) =>
          user.provider_id == currentUser?.user.user_metadata.provider_id
      );

      if (!findingExistedUser) {
        const userData = await supabase.from("users").insert([
          {
            email: currentUser?.user.user_metadata.email,
            full_name: currentUser?.user.user_metadata.full_name,
            avatar_url: currentUser?.user.user_metadata.avatar_url,
            provider_id: currentUser?.user.user_metadata.provider_id,
          },
        ]);
      }
    };

    storingUserData();
  }, [currentUser]);

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
        .select("id, message, user_uid, reply, files");

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
    <div className="grid h-dvh w-full place-items-center">
      <div className="absolute left-0 top-0 -z-50 h-96 w-full bg-accents-2/10 blur-3xl"></div>
      <div className="relative flex h-chat w-full max-w-sm flex-col overflow-hidden rounded-lg border">
        <header className="absolute z-10 flex w-full items-center justify-between border-b bg-black/60 px-4 py-2 backdrop-blur-sm">
          <Avatar className="h-auto w-auto">
            <AvatarImage src="/logo.png" alt="logo" className="h-6 w-6" id="" />
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
                  className="absolute right-0 w-40 translate-y-6 space-y-3 rounded-xl border bg-accents-1 p-2"
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
                    className="h-6 w-full text-xxs"
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
                  className="absolute right-0 w-40 translate-y-6 space-y-3 rounded-xl border bg-accents-1 p-2"
                >
                  {/* Sign out */}
                  <Link
                    href={"/login"}
                    className={buttonVariants({
                      className: "h-6 w-full text-xxs",
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
          className="custom-scrollbar relative flex h-full w-full flex-col items-start overflow-auto bg-background px-4 py-2 pt-12"
          ref={containerRef}
        >
          {messages?.length !== 0 ? (
            messages!.map((message) => (
              <EachMessage key={message.id} message={message} />
            ))
          ) : (
            <Box className="mt-3 h-full space-y-2 rounded-none border-none">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="ml-auto h-6 w-1/2" />
              <Skeleton className="ml-auto h-6 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="ml-auto h-6 w-1/2" />
              <Skeleton className="ml-auto h-6 w-1/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </Box>
          )}
        </div>

        {currentUser && <SendingMessage />}
      </div>
    </div>
  );
}
