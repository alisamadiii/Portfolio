"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

import CustomIcon from "@/assets/CustomIcon";
import { UseUserContext } from "@/context/User.context";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserInformationPopup } from "@/lib/animation";

type Props = {};

export default function Chat({}: Props) {
  const [isUserInformation, setIsUserInformation] = useState(false);
  const { currentUser } = UseUserContext();

  return (
    <div className="grid w-full h-dvh place-items-center">
      <div className="w-full max-w-sm border rounded-lg h-chat">
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
            {isUserInformation && (
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
                <Button variant={"error"} className="w-full h-6 text-xxs">
                  Sign out
                </Button>
              </motion.div>
            )}
          </div>
        </header>
      </div>
    </div>
  );
}
