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
} from "firebase/firestore";
import { formatDistance } from "date-fns";
import "vercel-toast/css";
import { createToast } from "vercel-toast";

import { User_Context } from "@/context/User_Context";
import { authStateChanged, db } from "@/utils/Firebase";
import { COMMENTS } from "@/Types/User";

import Meta_Tag from "@/layout/Head";
import Comment from "@/components/Comment";
import SignIn from "@/components/SignIn";

type Props = {};

export default function Chat_Community({}: Props) {
  const [inputField, setInputField] = useState("");
  const [comments, setComments] = useState<null | COMMENTS>(null);
  const [isNotSigned, setIsNotSigned] = useState<boolean>(false);

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
      from: currentUser?.email == null ? "github" : "google",
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

  return (
    <>
      <Meta_Tag
        title="Chat Community"
        description="This is the place where you can chat and have conversation with me."
      />
      <div className="max-w-[1000px] flex items-center flex-col mt-24 justify-center w-full gap-4 mx-auto p-4">
        <div
          ref={listComments}
          className="flex flex-col w-full overflow-x-hidden overflow-y-auto bg-light-blue-2 rounded-xl h-96"
        >
          {comments ? (
            comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                setIsNotSigned={setIsNotSigned}
              />
            ))
          ) : (
            <div className="self-center">
              <svg
                fill="none"
                className="w-16 text-primary h-1w-16 animate-spin"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clip-rule="evenodd"
                  d="M15.165 8.53a.5.5 0 01-.404.58A7 7 0 1023 16a.5.5 0 011 0 8 8 0 11-9.416-7.874.5.5 0 01.58.404z"
                  fill="currentColor"
                  fill-rule="evenodd"
                />
              </svg>
            </div>
          )}
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
      </div>
      {isNotSigned && <SignIn />}
    </>
  );
}
