import React, { useContext, useEffect, useRef } from "react";
import { deleteDoc, doc } from "firebase/firestore";

import { BsFillTrash3Fill } from "react-icons/bs";
import { useCommentsStore } from "@/context/Comments";
import { User_Context } from "@/context/User_Context";
import { convertTimestampToDateTime } from "@/utils";
import { db } from "@/utils/Firebase";

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

  console.log(comments);

  return (
    <ul
      id="chat"
      ref={listComments}
      className="flex flex-col items-start h-full gap-2 p-2 overflow-auto"
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
                {currentUser?.uid !== comment.userId && `${comment.name} - `}
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
    </ul>
  );
}
