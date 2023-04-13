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
import toast, { Toaster } from "react-hot-toast";

import { User_Context } from "@/context/User_Context";
import { authStateChanged, db } from "@/utils/Firebase";
import { COMMENT, COMMENTS } from "@/Types/User";

import Meta_Tag from "@/layout/Head";
import Comment from "@/components/Comment";
import EditComment from "@/components/EditComment";

type Props = {};

export default function Chat_Community({}: Props) {
  const [inputField, setInputField] = useState("");
  const [comments, setComments] = useState<null | COMMENTS>(null);

  const listComments = useRef<HTMLDivElement>(null);

  const { currentUser, setCurrentUser } = useContext(User_Context);

  useEffect(() => {
    authStateChanged((user) => {
      setCurrentUser(user);
    });
  }, []);

  const submitHandler = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (currentUser == null) return toast("You have to be Signed In");

    await addDoc(collection(db, "comments"), {
      name: currentUser!.displayName,
      message: inputField,
      image: currentUser!.photoURL,
      createdAt: serverTimestamp(),
      userId: currentUser?.uid,
      likes: [],
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
      <Meta_Tag />
      <div className="max-w-[1000px] flex items-center flex-col mt-24 justify-center w-full gap-4 mx-auto p-4">
        <div
          ref={listComments}
          className="flex flex-col w-full gap-3 p-4 overflow-y-auto bg-light-blue-2 rounded-xl h-96"
        >
          {comments &&
            comments.map((comment) => (
              <Comment key={comment.id} comment={comment} />
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
      </div>

      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          className: "",
          style: {
            border: "1px solid red",
            padding: "8px",
            color: "red",
            boxShadow: "0 4px 10px rgba(0, 0, 0, .01)",
          },
        }}
      />
    </>
  );
}
