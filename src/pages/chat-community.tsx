import Image from "next/image";
import React, { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { formatDistance } from "date-fns";
import "vercel-toast/css";
import { createToast } from "vercel-toast";
import { AnimatePresence, motion } from "framer-motion";

import { User_Context } from "@/context/User_Context";
import { authStateChanged, db } from "@/utils/Firebase";
import { COMMENTS } from "@/Types/User";

import Meta_Tag from "@/layout/Head";
import Comment from "@/components/Comment";
import SignIn from "@/components/SignIn";
import * as SelectList from "@/components/Select";

import { BiLeftArrowAlt, BiMessageRounded } from "react-icons/bi";
import { IoMdSend } from "react-icons/io";
import Logo from "@/assets/logo.jpg";
import { convertTimestampToDateTime } from "@/utils";
import { BsFillTrash3Fill } from "react-icons/bs";

type Props = {};

export default function Chat_Community({}: Props) {
  const [inputField, setInputField] = useState("");
  const [comments, setComments] = useState<null | COMMENTS>(null);
  const [isNotSigned, setIsNotSigned] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chatType, setChatType] = useState<"chat" | "question">("chat");

  const listComments = useRef<HTMLUListElement>(null);

  const { currentUser, setCurrentUser } = useContext(User_Context);

  useEffect(() => {
    authStateChanged((user) => {
      setCurrentUser(user);
    });
  }, []);

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

  useEffect(() => {
    const colRef = collection(db, "comments");
    const q = query(colRef, orderBy("createdAt"));

    setTimeout(() => {
      onSnapshot(q, (snapshot: any) => {
        setComments(
          snapshot.docs.map((comment: any) => ({
            ...comment.data(),
            id: comment.id,
          }))
        );
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    const scrollToLastMessage = () => {
      const lastElement = listComments.current!.lastElementChild;
      lastElement?.scrollIntoView();
    };
    scrollToLastMessage();
  }, [comments]);

  const timeFormat = (date: string) => {
    return formatDistance(new Date(date), new Date());
  }; // yyyy/mm/dd

  const deletingComment = async (id: string) => {
    const docRef = doc(db, "comments", id);
    await deleteDoc(docRef);
  };

  return (
    <>
      <Meta_Tag
        title="Chat Community"
        description="This is the place where you can chat and have conversation with me."
      />
      <div className="relative mt-24 w-full max-w-[452px] mx-auto bg-white shadow-container rounded-xl overflow-hidden">
        <header className="sticky top-0 flex items-center p-2 text-2xl text-white bg-primary">
          <Link href={"/"}>
            <BiLeftArrowAlt />
          </Link>
          <Image
            src={Logo}
            width={100}
            height={100}
            alt="logo"
            className="w-8 rounded-full"
          />
          <small className="ml-2 font-medium">Community Chat</small>
        </header>
        <ul
          id="chat"
          ref={listComments}
          className="flex flex-col items-start gap-2 p-2 h-[500px] overflow-auto"
        >
          {comments &&
            comments.map((comment) => (
              <>
                <li
                  key={comment.id}
                  className={` text-white p-2 rounded-xl max-w-[300px] min-w-[100px] ${
                    comment.userId == currentUser?.uid
                      ? "self-end rounded-tr-none bg-[#00B871]"
                      : "rounded-tl-none bg-primary"
                  }`}
                >
                  <span>{comment.message}</span>
                  <span className="float-right mt-2 ml-2 text-xs opacity-80">
                    {currentUser?.uid !== comment.userId &&
                      `${comment.name} - `}
                    {comment.createdAt &&
                      convertTimestampToDateTime(comment.createdAt.seconds)}
                  </span>
                </li>
                {currentUser?.uid == comment.userId && (
                  <p
                    onClick={() => deletingComment(comment.id)}
                    className="p-1 ml-auto text-red-700 rounded-md cursor-pointer bg-red-700/10"
                  >
                    <BsFillTrash3Fill />
                  </p>
                )}
              </>
            ))}
          {isLoading && <div>loading...</div>}
        </ul>
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
      </div>
      {isNotSigned && <SignIn />}
    </>
  );
}
