import Image from "next/image";
import React, { useContext, useState } from "react";

import { motion } from "framer-motion";
import { BsFillTrash3Fill } from "react-icons/bs";
import { AiFillLike } from "react-icons/ai";
import { User_Context } from "@/context/User_Context";
import { COMMENT } from "@/Types/User";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/utils/Firebase";

type Props = {
  comment: COMMENT;
};

export default function Comment({ comment }: Props) {
  const { currentUser } = useContext(User_Context);

  const deletingComment = async (id: string) => {
    const docRef = doc(db, "comments", id);
    await deleteDoc(docRef);
  };

  const updatingLikes = (comment: COMMENT) => {
    const docRef = doc(db, "comments", comment.id);

    const findingUser = comment.likes.find(
      (like) => like.id == currentUser?.uid
    );

    if (findingUser) {
      const filterUser = comment.likes.filter(
        (like) => like.id !== currentUser?.uid
      );
      return updateDoc(docRef, {
        likes: filterUser,
      });
    }

    updateDoc(docRef, {
      likes: [
        ...comment.likes,
        { id: currentUser?.uid, name: currentUser?.displayName },
      ],
    });
  };

  const findingComment = comment.likes.find(
    (like) => like.id === currentUser?.uid
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      layout="position"
      className="flex items-center gap-4"
    >
      <Image
        src={comment.image}
        width={100}
        height={100}
        alt=""
        className="self-start w-8 h-8 rounded-full"
      />
      <div className="grow">
        <small className="italic opacity-60">{comment.name}</small>
        <p>{comment.message}</p>
        {/* <small>{timeFormat(comment.createdAt.seconds)}</small> */}
      </div>
      <div className="flex items-center gap-2">
        <p
          className={`${
            findingComment && "text-blue-600"
          } flex bg-blue-600/10 p-1 rounded-md cursor-pointer gap-1 active:scale-95 duration-100`}
          onClick={() => updatingLikes(comment)}
        >
          <AiFillLike />
          <span className="text-xs">{comment.likes.length}</span>
        </p>
        {currentUser?.uid === comment.userId && (
          <p
            onClick={() => deletingComment(comment.id)}
            className="p-1 text-red-700 rounded-md cursor-pointer bg-red-700/10"
          >
            <BsFillTrash3Fill />
          </p>
        )}
        {currentUser?.uid === process.env.NEXT_PUBLIC_OWNER && (
          <p
            onClick={() => deletingComment(comment.id)}
            className="p-1 text-green-700 rounded-md cursor-pointer bg-green-700/10"
          >
            <BsFillTrash3Fill />
          </p>
        )}
      </div>
    </motion.div>
  );
}
