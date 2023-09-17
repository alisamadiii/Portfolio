"use client";

import Link from "next/link";
import React, { useEffect } from "react";

import CustomIcon from "@/assets/CustomIcon";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

import { AiFillGithub, AiOutlineGoogle } from "react-icons/ai";
import { Text } from "@/components/ui/text";

import { supabase } from "@/utils/supabase";
import { useToast } from "@/components/ui/use-toast";
import { UseUserContext } from "@/context/User.context";

type Props = {};

export default function Login({}: Props) {
  const { toast } = useToast();
  const { currentUser } = UseUserContext();

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  const UnderConstruction = () => {
    toast({
      title: "I am having hard time making it to work",
      description: "You can sign in with Google",
      variant: "destructive",
    });
  };

  console.log(currentUser);

  if (currentUser == null) {
    return (
      <div className="relative w-full overflow-hidden h-dvh">
        <Container size={"2xl"} className="pt-20 space-y-16">
          <Link
            href={"/"}
            className="flex items-center gap-3 duration-200 hover:gap-4 hover:text-accents-7"
          >
            <CustomIcon icon="back-arrow" />
            Back
          </Link>
          <div className="space-y-6">
            <Text size={32} className="text-foreground">
              Sign up / Log in
            </Text>
            <div className="space-y-3">
              <Button variant={"github"} onClick={UnderConstruction}>
                <AiFillGithub className="text-2xl" /> Continue with GitHub
              </Button>
              <Button variant={"google"} onClick={signInWithGoogle}>
                <AiOutlineGoogle className="text-2xl" /> Continue with Google
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="grid w-full h-dvh place-items-center">
      <Text size={32} className="text-foreground">
        <span className="px-2 rounded bg-foreground text-background">
          {currentUser.user.user_metadata.full_name}
        </span>
        , You are signed in
      </Text>
    </div>
  );
}
