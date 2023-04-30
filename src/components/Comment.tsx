import Image from "next/image";
import React, { useContext, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { BsFillTrash3Fill } from "react-icons/bs";
import { AiFillLike, AiFillEdit, AiFillGithub } from "react-icons/ai";
import { User_Context } from "@/context/User_Context";
import { COMMENT } from "@/Types/User";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/utils/Firebase";
import EditComment from "./EditComment";

import { FcGoogle } from "react-icons/fc";
import { BiCrown } from "react-icons/bi";
import { createToast } from "vercel-toast";

type Props = {
  comment: COMMENT;
  setIsNotSigned: (a: boolean) => void;
};

export default function Comment({ comment, setIsNotSigned }: Props) {
  const { currentUser } = useContext(User_Context);
  const [editOpen, setEditOpen] = useState<boolean>(false);

  const deletingComment = async (id: string) => {
    const docRef = doc(db, "comments", id);
    await deleteDoc(docRef);
  };

  const updatingLikes = (comment: COMMENT) => {
    if (currentUser == null) {
      setIsNotSigned(true);
      return createToast("You must be Signed In", {
        timeout: 3000,
        type: "error",
      });
    }

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
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        layout="position"
        className="flex flex-wrap items-center gap-4 px-4 py-2 hover:bg-dark-blue-2/10"
      >
        <div className="relative self-start w-8 h-8">
          <Image
            src={comment.image}
            width={100}
            height={100}
            alt=""
            className="rounded-full"
          />
          {comment.from == "github" ? (
            <div className="absolute bottom-0 right-0 p-[2px] rounded-sm text-xs translate-y-2 bg-white/50 backdrop-blur-sm">
              <AiFillGithub />
            </div>
          ) : (
            <div className="absolute bottom-0 right-0 p-[2px] rounded-sm text-xs translate-y-2 bg-white/50 backdrop-blur-sm">
              <FcGoogle />
            </div>
          )}
          {comment.userId === process.env.NEXT_PUBLIC_OWNER && (
            <div className="absolute bottom-0 right-0 p-[2px] rounded-sm text-xs translate-y-2 bg-white/50 text-yellow-500 backdrop-blur-sm">
              <BiCrown />
            </div>
          )}
        </div>
        <div className="grow">
          <small className="italic opacity-60">{comment.name}</small>
          <p className="text-sm md:text-base">{comment.message}</p>
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
            <>
              <p
                onClick={() => setEditOpen(!editOpen)}
                className="p-1 text-yellow-500 rounded-md cursor-pointer bg-yellow-500/10"
              >
                <AiFillEdit />
              </p>
              <p
                onClick={() => deletingComment(comment.id)}
                className="p-1 text-red-700 rounded-md cursor-pointer bg-red-700/10"
              >
                <BsFillTrash3Fill />
              </p>
            </>
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

      <AnimatePresence>
        {editOpen && (
          <EditComment comment={comment} setEditOpen={setEditOpen} />
        )}
      </AnimatePresence>
    </>
  );
}
