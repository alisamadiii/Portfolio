"use client";

import Link from "next/link";
import React from "react";

import CustomIcon from "@/assets/CustomIcon";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

import { AiFillGithub, AiOutlineGoogle } from "react-icons/ai";
import { Text } from "@/components/ui/text";

import { supabase } from "@/utils/supabase";
import { useToast } from "@/components/ui/use-toast";
import { UseUserContext } from "@/context/User.context";

export default function Login() {
  const { toast } = useToast();
  const { currentUser } = UseUserContext();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/chat`,
      },
    });
  };

  const UnderConstruction = () => {
    toast({
      title: "I am having hard time making it to work",
      description: "You can sign in with Google",
      variant: "destructive",
    });
  };

  if (currentUser == null) {
    return (
      <div className="relative h-dvh w-full overflow-hidden">
        <Container size={"2xl"} className="space-y-16 pt-20">
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
    <div className="grid h-dvh w-full place-items-center">
      <Text size={32} className="text-foreground">
        <span className="rounded bg-foreground px-2 text-background">
          {currentUser.user.user_metadata.full_name}
        </span>
        , You are signed in
      </Text>
    </div>
  );
}
