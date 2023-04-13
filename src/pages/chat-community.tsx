import Image from "next/image";
import React, {
  ChangeEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { motion } from "framer-motion";
import { formatDistance } from "date-fns";

import { User_Context } from "@/context/User_Context";
import { authStateChanged, db, signInWithGithub } from "@/utils/Firebase";
import { COMMENTS } from "@/Types/User";

import { BsFillTrash3Fill } from "react-icons/bs";
import LogIn from "@/components/LogIn";

type Props = {};

export default function Chat_Community({}: Props) {
  const [inputField, setInputField] = useState("");
  const [comments, setComments] = useState<null | COMMENTS>(null);
  const [errorHandle, setErrorHandle] = useState<boolean>(false);

  const listComments = useRef<HTMLDivElement>(null);

  const { currentUser, setCurrentUser } = useContext(User_Context);

  useEffect(() => {
    authStateChanged((user) => {
      setCurrentUser(user);
    });
  }, []);

  const submitHandler = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (currentUser == null) {
      return setErrorHandle(true);
    }

    await addDoc(collection(db, "comments"), {
      name: currentUser!.displayName,
      message: inputField,
      image: currentUser!.photoURL,
      createdAt: serverTimestamp(),
      userId: currentUser?.uid,
    });
    setInputField("");
  };

  useEffect(() => {
    const colRef = collection(db, "comments");
    const q = query(colRef, orderBy("createdAt"));

    onSnapshot(q, (snapshot: any) => {
      setComments(
        snapshot.docs.map((comment: any) => ({
          ...comment.data(),
          id: comment.id,
        }))
      );
    });
  }, []);

  useEffect(() => {
    const scrollToLastMessage = () => {
      const lastElement = listComments.current!.lastElementChild;
      lastElement?.scrollIntoView({});
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
    <div className="max-w-[1000px] flex items-center flex-col mt-24 justify-center w-full gap-4 mx-auto p-4">
      <div
        ref={listComments}
        className="flex flex-col w-full gap-3 p-4 overflow-y-auto bg-light-blue-2 rounded-xl h-96"
      >
        {comments &&
          comments.map((comment) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              layout="position"
              className="flex items-center gap-4"
              key={comment.id}
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
              <div
                onClick={() => deletingComment(comment.id)}
                className="flex gap-2"
              >
                {currentUser?.uid === comment.userId && (
                  <p className="p-1 text-red-700 rounded-md cursor-pointer bg-red-700/10">
                    <BsFillTrash3Fill />
                  </p>
                )}
                {currentUser?.uid === process.env.NEXT_PUBLIC_OWNER && (
                  <p className="p-1 text-green-700 rounded-md cursor-pointer bg-green-700/10">
                    <BsFillTrash3Fill />
                  </p>
                )}
              </div>
            </motion.div>
          ))}
      </div>
      <form onSubmit={submitHandler} className="w-full gap-2 mt-auto">
        <div className="flex items-center p-2 border-2 rounded-md border-primary">
          {currentUser && (
            <Image
              src={currentUser.photoURL}
              width={100}
              height={100}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <input
            value={inputField}
            onChange={(e) => setInputField(e.target.value)}
            type="text"
            className="w-full p-2 bg-transparent rounded-md outline-none"
            placeholder="write"
          />
        </div>
        <small>Please, Do not spam the chat...</small>
      </form>

      {errorHandle && <LogIn />}
    </div>
  );
}
