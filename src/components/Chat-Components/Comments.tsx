import React, { useContext, useEffect, useRef, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { motion } from "framer-motion";

import { BsFillTrash3Fill } from "react-icons/bs";
import { AiFillLike } from "react-icons/ai";
import { useCommentsStore } from "@/context/Comments";
import { User_Context } from "@/context/User_Context";
import { convertTimestampToDateTime } from "@/utils";
import { db } from "@/utils/Firebase";
import { COMMENT } from "@/Types/User";
import Like from "./Like";

type Props = {};

export default function Comments({}: Props) {
  const { comments } = useCommentsStore();
  const { currentUser } = useContext(User_Context);

  const listComments = useRef<HTMLUListElement>(null);

  const deletingComment = async (id: string) => {
    const docRef = doc(db, "comments", id);
    await deleteDoc(docRef);
  };

  useEffect(() => {
    const scrollToLastMessage = () => {
      const lastElement = listComments.current!.lastElementChild;
      lastElement?.scrollIntoView();
    };
    scrollToLastMessage();
  }, [comments]);

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

  // Finding comments
  const findingComment = (comment: COMMENT) => {
    return comment.likes.find((like) => like.id === currentUser?.uid);
  };

  return (
    <ul
      id="chat"
      ref={listComments}
      className="flex flex-col items-start h-full gap-2 p-2 overflow-auto"
    >
      {comments &&
        comments.map((comment) => (
          <motion.li
            key={comment.id}
            layout
            className={`group relative text-white p-2 rounded-xl max-w-[300px] min-w-[100px] transition-colors duration-150 ${
              comment.userId == currentUser?.uid
                ? `self-end rounded-tr-none ${
                    isCtrlPressed ? "bg-red-600 cursor-pointer" : "bg-[#00B871]"
                  }`
                : "rounded-tl-none bg-primary"
            } ${
              process.env.NEXT_PUBLIC_OWNER == comment.userId &&
              "!bg-orange-500"
            }`}
            onClick={() => {
              isCtrlPressed &&
                (currentUser?.uid == comment.userId ||
                  process.env.NEXT_PUBLIC_OWNER == currentUser?.uid) &&
                deletingComment(comment.id);
            }}
          >
            <span>{comment.message}</span>
            <span className="float-right mt-2 ml-2 text-xs opacity-80">
              {currentUser?.uid !== comment.userId && `${comment.name} - `}
              {comment.createdAt &&
                convertTimestampToDateTime(comment.createdAt.seconds)}
            </span>
            <div
              className={`absolute top-1/2 flex items-center gap-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 ${
                currentUser?.uid == comment.userId
                  ? "left-0 -translate-x-[calc(100%+10px)]"
                  : "right-0 translate-x-[calc(100%+10px)]"
              }`}
            >
              <Like comment={comment} />
            </div>
          </motion.li>
        ))}
    </ul>
  );
}
