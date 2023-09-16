"use client";

import Link from "next/link";
import React, { useEffect } from "react";

import CustomIcon from "@/assets/CustomIcon";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

import { AiFillGithub, AiOutlineGoogle } from "react-icons/ai";
import { Text } from "@/components/ui/text";

import { supabase } from "@/utils/supabase";

type Props = {};

export default function Login({}: Props) {
  const signInWithGitHub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
    });

    if (error) {
      console.log(error);
    }

    console.log(data);
  };

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
            <Button variant={"github"}>
              <AiFillGithub className="text-2xl" /> Continue with GitHub
            </Button>
            <Button variant={"google"}>
              <AiOutlineGoogle className="text-2xl" /> Continue with Google
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
