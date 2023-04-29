import React from "react";
import { motion } from "framer-motion";

type Props = {};

// Icons
import { FcGoogle } from "react-icons/fc";
import { AiFillGithub } from "react-icons/ai";

import { signInWithGithub, signInWithGoogle } from "@/utils/Firebase";

export default function SignIn({}: Props) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      className="fixed bottom-0 z-50 flex flex-col gap-2 p-4 bg-white border shadow-lg w-60 left-4 rounded-t-xl"
    >
      <button
        className="flex items-center justify-center gap-2 py-2 rounded-md bg-light-blue"
        onClick={signInWithGoogle}
      >
        <FcGoogle />
        Google
      </button>
      <button
        className="flex items-center justify-center gap-2 py-2 text-white rounded-md bg-[#0d1117]"
        onClick={signInWithGithub}
      >
        <AiFillGithub />
        GitHub
      </button>
    </motion.div>
  );
}
