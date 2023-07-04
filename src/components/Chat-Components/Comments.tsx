import React, { useContext, useEffect, useRef, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";

import { useCommentsStore } from "@/context/Comments";
import { User_Context } from "@/context/User_Context";
import { convertTimestampToDateTime, firstName } from "@/utils";
import { db } from "@/utils/Firebase";
import Like from "./Like";
import Image from "next/image";
import Reply from "./Reply";
import Delete from "./Delete";

type Props = {};

export default function Comments({}: Props) {
  const { comments } = useCommentsStore();
  const { currentUser } = useContext(User_Context);

  const deletingComment = async (id: string) => {
    const docRef = doc(db, "comments", id);
    await deleteDoc(docRef);
  };

  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.ctrlKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = () => {
      setIsCtrlPressed(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
  }, []);

  const chatContainerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  function scrollToBottom() {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }

  let previousUser: any = null;

  return (
    <ul
      id="chat"
      ref={chatContainerRef}
      className="flex flex-col items-start gap-2 p-2 pt-6 overflow-auto grow h-96"
    >
      {comments &&
        comments.map((comment) => {
          const isSameUser = comment.userId === previousUser;
          previousUser = comment.userId;

          return (
            <motion.li
              key={comment.id}
              layout
              className={`group flex items-center gap-2 ${
                comment.userId == currentUser?.uid
                  ? "self-end flex-row-reverse"
                  : ""
              }`}
            >
              {/* Image */}
              {!isSameUser && (
                <Image
                  src={comment.image}
                  width={40}
                  height={40}
                  alt={comment.name}
                  className="self-start -translate-y-3 rounded-full w-7"
                />
              )}
              {isSameUser && <div className="w-7" />}
              {/* Comment */}
              <div className="flex flex-col -space-y-1">
                {comment.reply && (
                  <a
                    href={`#${comment.reply.id}`}
                    className="inline-block max-w-[300px] min-w-[100px] text-xs bg-[#EBEBEB] hover:bg-white opacity-80 rounded-xl p-1"
                  >
                    <small>{firstName(comment.reply.name)}</small>
                    <p className="line-clamp-2">{comment.reply.message}</p>
                  </a>
                )}
                <div
                  id={comment.id}
                  className={`group relative text-white p-2 rounded-xl max-w-[300px] min-w-[100px] duration-150 ${
                    comment.userId == currentUser?.uid
                      ? `self-end ${
                          isCtrlPressed
                            ? "bg-red-600 cursor-pointer"
                            : "bg-[#00B871]"
                        } ${!isSameUser ? "rounded-tr-none" : ""}`
                      : `bg-primary ${!isSameUser ? "rounded-tl-none" : ""}`
                  } ${
                    process.env.NEXT_PUBLIC_OWNER == comment?.userId &&
                    "!bg-orange-600"
                  } `}
                  onClick={() => {
                    isCtrlPressed &&
                      (currentUser?.uid == comment.userId ||
                        process.env.NEXT_PUBLIC_OWNER == currentUser?.uid) &&
                      deletingComment(comment.id);
                  }}
                >
                  <span className="inline-block leading-6">
                    {comment.message}
                  </span>
                  <span className="float-right mt-2 ml-2 text-xs opacity-80">
                    {currentUser?.uid !== comment.userId &&
                      !isSameUser &&
                      `${firstName(comment.name)} - `}
                    {comment.createdAt &&
                      convertTimestampToDateTime(comment.createdAt.seconds)}
                  </span>
                </div>
              </div>
              {/* Edit */}
              <div className="flex items-center gap-2 duration-200 opacity-0 group-hover:opacity-100">
                <Like comment={comment} />
                <Reply comment={comment} />
                {(currentUser?.uid == comment.userId ||
                  process.env.NEXT_PUBLIC_OWNER == currentUser?.uid) && (
                  <Delete commentId={comment.id} />
                )}
              </div>
            </motion.li>
          );
        })}

      {comments.length == 0 && (
        <div className="flex flex-col w-full gap-3 p-2 rounded-md">
          {/* @ts-ignore */}
          {[...Array(10).keys()].map((_, index) => (
            <div key={index} className="w-full h-12 bg-white animate-pulse" />
          ))}
        </div>
      )}
    </ul>
  );
}
