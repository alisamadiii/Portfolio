import { useReplyStore } from "@/context/Reply";
import { User_Context } from "@/context/User_Context";
import { db } from "@/utils/Firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import React, { useContext, useState } from "react";
import { BiMessageRounded } from "react-icons/bi";
import { IoMdSend, IoMdCloseCircle } from "react-icons/io";
import { createToast } from "vercel-toast";

type Props = {
  setIsNotSigned: (a: boolean) => void;
};

export default function Input({ setIsNotSigned }: Props) {
  const [inputField, setInputField] = useState("");
  const [chatType, setChatType] = useState<"chat" | "question">("chat");

  const { currentUser } = useContext(User_Context);
  const { replyComment, setReplyComment } = useReplyStore();

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
      reply: replyComment,
      image: currentUser!.photoURL,
      createdAt: serverTimestamp(),
      userId: currentUser?.uid,
      likes: [],
      chatType,
      answers: [],
      from: currentUser?.email == null ? "github" : "google",
    });
    setInputField("");
    setReplyComment(null);
  };

  return (
    <form
      className="flex items-center gap-2 p-2 "
      onSubmit={(e) => submitHandler(e)}
    >
      <div className="grow">
        {replyComment && (
          <div className="bg-[#EBEBEB] rounded-t-xl p-2 text-xs flex items-center">
            <div className="grow">
              <small>{replyComment.name}</small>
              <p className="line-clamp-1">{replyComment.message}</p>
            </div>
            <div className="text-xl">
              <IoMdCloseCircle
                onClick={() => setReplyComment(null)}
                className=""
              />
            </div>
          </div>
        )}
        <input
          type="text"
          className={`bg-[#EBEBEB] w-full p-2 outline-none focus:ring-2 ring-[#00B871] transition-[box-shadow] duration-150 ${
            replyComment ? "rounded-b-xl" : "rounded-full"
          }`}
          placeholder={replyComment ? "Reply" : "Message"}
          value={inputField}
          onChange={(e) => setInputField(e.target.value)}
        />
      </div>
      <motion.button
        layout="position"
        className="bg-[#00B871] text-white p-2 rounded-full text-2xl"
      >
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
      </motion.button>
    </form>
  );
}
