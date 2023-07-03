import { User_Context } from "@/context/User_Context";
import { db } from "@/utils/Firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import React, { useContext, useState } from "react";
import { BiMessageRounded } from "react-icons/bi";
import { IoMdSend } from "react-icons/io";
import { createToast } from "vercel-toast";

type Props = {
  setIsNotSigned: (a: boolean) => void;
};

export default function Input({ setIsNotSigned }: Props) {
  const [inputField, setInputField] = useState("");
  const [chatType, setChatType] = useState<"chat" | "question">("chat");

  const { currentUser } = useContext(User_Context);

  const submitHandler = async (e: any) => {
    e.preventDefault();

    if (inputField.length == 0) return;

    if (currentUser == null) {
      setIsNotSigned(true);
      return createToast("You must be Signed In", {
        timeout: 3000,
        type: "error",
      });
    }

    await addDoc(collection(db, "comments"), {
      name: currentUser!.displayName,
      message: inputField,
      image: currentUser!.photoURL,
      createdAt: serverTimestamp(),
      userId: currentUser?.uid,
      likes: [],
      chatType,
      answers: [],
      from: currentUser?.email == null ? "github" : "google",
    });
    setInputField("");
  };

  return (
    <form
      className="flex items-center gap-2 p-2"
      onSubmit={(e) => submitHandler(e)}
    >
      <input
        type="text"
        className="bg-[#EBEBEB] grow p-2 rounded-full outline-none focus:ring-2 ring-[#00B871] duration-150"
        placeholder="Message"
        value={inputField}
        onChange={(e) => setInputField(e.target.value)}
      />
      <button className="bg-[#00B871] text-white p-2 rounded-full text-2xl">
        <AnimatePresence mode="wait" initial={false}>
          {inputField.length == 0 ? (
            <motion.p
              key={"empty"}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <BiMessageRounded />
            </motion.p>
          ) : (
            <motion.p
              key={"send"}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <IoMdSend />
            </motion.p>
          )}
        </AnimatePresence>
      </button>
    </form>
  );
}
