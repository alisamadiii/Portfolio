import React, { useContext, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { BsFillTrash3Fill } from "react-icons/bs";
import { AiFillLike, AiFillEdit } from "react-icons/ai";
import { User_Context } from "@/context/User_Context";
import { COMMENT } from "@/Types/User";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/utils/Firebase";
import EditComment from "./EditComment";

import { createToast } from "vercel-toast";

// Icons
import { BsQuestionDiamondFill, BsThreeDotsVertical } from "react-icons/bs";
import { FcManager } from "react-icons/fc";

type Props = {
  comment: COMMENT;
  setIsNotSigned: (a: boolean) => void;
};

export default function Comment({ comment, setIsNotSigned }: Props) {
  const { currentUser } = useContext(User_Context);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [isChangeComment, setIsChangeComment] = useState<boolean>(false);
  const [isAnswer, setIsAnswer] = useState<[boolean, COMMENT | null]>([
    false,
    null,
  ]);
  const [toggleAnswer, setToggleAnswer] = useState(false);

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

  function toDateTime(timeStamp: number) {
    const date = new Date(timeStamp);
    const dateFormat =
      date.getHours() + ":" + date.getMinutes() + ", " + date.toDateString();
    return dateFormat;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        layout="position"
        className={`relative flex items-start gap-4 px-4 py-2 hover:bg-dark-blue-2/5 isolate ${
          currentUser?.uid == comment.userId && "bg-dark-blue-2/10"
        } ${
          comment.chatType == "question" && "!bg-secondary/20"
        } before:absolute before:inset-0 before:bg-white before:duration-200 before:-z-10 ${
          isChangeComment ? "before:opacity-100" : "before:opacity-0"
        }`}
      >
        {/* Icons for Question */}
        {comment.chatType == "question" && (
          <div className="text-secondary">
            <BsQuestionDiamondFill />
          </div>
        )}

        {/* Name + messages */}
        <div className="grow">
          <div
            className={`${
              comment.userId === process.env.NEXT_PUBLIC_OWNER && "flex gap-1"
            }`}
          >
            {comment.userId === process.env.NEXT_PUBLIC_OWNER && <FcManager />}
            <small className="italic opacity-60">{comment.name}</small>
            {/* <small className="text-xs italic opacity-60">
              {toDateTime(comment.createdAt.seconds)}
            </small> */}
          </div>
          <p className="text-sm md:text-base">{comment.message}</p>

          {/* Answering */}
          <div className="flex gap-2 py-2 text-xs md:text-sm">
            {comment.chatType == "question" && (
              <button
                className="italic underline"
                onClick={() => setIsAnswer([true, comment])}
              >
                Answer It
              </button>
            )}
            {comment!.answers !== undefined && comment.answers.length != 0 && (
              <button
                className="italic underline"
                onClick={() => setToggleAnswer(!toggleAnswer)}
              >
                Show Replies
              </button>
            )}
          </div>
        </div>

        {/* Icons for liking */}
        <p
          className={`${
            findingComment && "text-blue-600"
          } flex bg-blue-600/10 p-1 rounded-md cursor-pointer gap-1 active:scale-95 duration-100`}
          onClick={() => updatingLikes(comment)}
        >
          <AiFillLike />
          <span className="text-xs">{comment.likes.length}</span>
        </p>

        {/* Icons for bringing changes */}
        <AnimatePresence>
          {isChangeComment && (
            <motion.div
              initial={{ scale: 0.9, y: 5 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 5, opacity: 0 }}
              className="absolute flex items-center gap-2 p-2 rounded-md shadow-lg right-4 bg-light-blue -top-6"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3 Dots for opening and closing */}
        {currentUser?.uid == comment.userId ? (
          <div
            className={`p-1 rounded-md ${
              isChangeComment
                ? "bg-dark-blue text-light-blue"
                : "bg-dark-blue/10 text-dark-blue"
            }`}
            onClick={() => setIsChangeComment(!isChangeComment)}
          >
            <BsThreeDotsVertical />
          </div>
        ) : (
          currentUser?.uid === process.env.NEXT_PUBLIC_OWNER && (
            <div
              className={`p-1 rounded-md ${
                isChangeComment
                  ? "bg-dark-blue text-light-blue"
                  : "bg-dark-blue/10 text-dark-blue"
              }`}
              onClick={() => setIsChangeComment(!isChangeComment)}
            >
              <BsThreeDotsVertical />
            </div>
          )
        )}
      </motion.div>

      <AnimatePresence>
        {editOpen && (
          <EditComment comment={comment} setEditOpen={setEditOpen} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnswer[1] && comment.chatType == "question" && (
          <Answering_Question
            comment={isAnswer}
            setIsAnswer={setIsAnswer}
            currentUserId={currentUser!.uid}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toggleAnswer && (
          <div>
            {comment.answers.map((answer, index) => (
              <div
                key={index}
                className="flex items-center w-full gap-2 p-2 bg-green-200"
              >
                <small className="italic opacity-60">{answer.name}</small>
                <p className="text-sm md:text-base">{answer.answer}</p>
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

type Answering_QuestionProps = {
  comment: [boolean, COMMENT | null];
  setIsAnswer: (a: [boolean, null]) => void;
  currentUserId: string;
};

// Answering
export const Answering_Question = ({
  comment,
  setIsAnswer,
  currentUserId,
}: Answering_QuestionProps) => {
  const [answer, setAnswer] = useState("");

  const addingAnswerFunctions = async (commentId: string) => {
    const docRef = doc(db, "comments", commentId);
    await updateDoc(docRef, {
      answers: [
        ...comment[1]!.answers,
        { userId: currentUserId, name: comment[1]!.name, answer },
      ],
    });
    setIsAnswer([false, null]);
  };

  return (
    <div className="fixed top-0 left-0 z-50 flex items-center justify-center w-full h-full">
      <div
        className="absolute inset-0 bg-slate-700/10 -z-10"
        onClick={() => setIsAnswer([false, null])}
      />
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-container p-4 space-y-5">
        {/* Question */}
        <div className="flex flex-col items-start gap-1">
          <span className="px-2 py-1 text-sm text-white rounded-md bg-slate-800">
            Question
          </span>
          {comment[1]?.message}
        </div>
        {/* Answer */}
        <div className="flex flex-col items-start gap-2">
          <span className="px-2 py-1 text-sm text-white rounded-md bg-slate-800">
            Answer
          </span>
          <input
            type="text"
            placeholder="your answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full p-2 duration-200 border-2 rounded-md outline-none border-slate-400 focus:border-slate-800"
          />
          <button
            className="px-3 py-1 text-white rounded-md bg-slate-800"
            onClick={() => addingAnswerFunctions(comment[1]!.id)}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};
