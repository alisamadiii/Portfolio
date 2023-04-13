import React from "react";

import { signInWithGithub } from "@/utils/Firebase";

type Props = {};

import { AiFillGithub } from "react-icons/ai";

export default function LogIn({}: Props) {
  const signIn = async () => {
    const res = await signInWithGithub();
  };

  return (
    <div className="fixed top-0 left-0 flex items-center justify-center w-full h-screen">
      <div className="absolute top-0 left-0 w-full h-full bg-light-blue-2/50 -z-10"></div>
      <button
        onClick={signIn}
        className="flex items-center gap-2 px-4 py-2 text-xl bg-white rounded-md shadow-button"
      >
        <AiFillGithub />
        <span className="text-sm font-medium">Sign In with GitHub</span>
      </button>
    </div>
  );
}
