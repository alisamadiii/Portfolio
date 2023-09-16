"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

import CustomIcon from "@/assets/CustomIcon";
import { UseUserContext } from "@/context/User.context";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { UserInformationPopup } from "@/lib/animation";
import { signout, supabase } from "@/utils/supabase";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { RotatingLines } from "react-loader-spinner";

type Props = {};

export default function Chat({}: Props) {
  const [isUserInformation, setIsUserInformation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser } = UseUserContext();

  const AddingText = async () => {
    const { data, error } = await supabase
      .from("Chat History")
      .insert([{ user_email: currentUser.user.email }])
      .select();
  };

  const signOutHandler = async () => {
    setIsLoading(true);
    await signout();
    setCurrentUser(null);
    setIsLoading(false);
  };

  return (
    <div className="grid w-full h-dvh place-items-center">
      <div className="relative w-full max-w-sm overflow-hidden border rounded-lg h-chat">
        <header className="flex items-center justify-between w-full px-4 py-2 border-b">
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
        {currentUser && (
          <footer className="absolute bottom-0 left-0 flex items-center justify-between w-full gap-2 p-2 bg-background">
            {/* Inputs */}
            <Label
              className={`flex items-center bg-accents-1 grow rounded-full pl-2 pr-3 py-2`}
            >
              <textarea
                className="py-1 bg-transparent outline-none resize-none grow placeholder:text-accents-6/50"
                rows={1}
                placeholder="your message"
              />
              <CustomIcon icon="photo" className="w-4 h-4 text-foreground" />
            </Label>
            {/* Send */}
            <div className="p-2 rounded-full bg-foreground text-background">
              <CustomIcon icon="send" />
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
