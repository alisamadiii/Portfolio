import React, { useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "vercel-toast/css";

import { User_Context } from "@/context/User_Context";
import { useCommentsStore } from "@/context/Comments";
import { authStateChanged, db } from "@/utils/Firebase";

import Meta_Tag from "@/layout/Head";
import SignIn from "@/components/SignIn";

import { Header, Comments, Input } from "@/components/Chat-Components";

type Props = {};

export default function Chat_Community({}: Props) {
  const [isNotSigned, setIsNotSigned] = useState<boolean>(false);
  const { setComments } = useCommentsStore();
  const { setCurrentUser } = useContext(User_Context);

  useEffect(() => {
    authStateChanged((user) => {
      setCurrentUser(user);
    });
  }, []);

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
    }, 1000);
  }, []);

  // const timeFormat = (date: string) => {
  //   return formatDistance(new Date(date), new Date());
  // }; // yyyy/mm/dd

  return (
    <>
      <Meta_Tag
        title="Chat Community"
        description="This is the place where you can chat and have conversation with me."
      />
      <div className="absolute inset-0 w-full h-full bg-center bg-cover bg-grainy-gradient" />
      <div className="absolute inset-0 w-full h-full bg-pattern" />
      <div className="cookie-consent flex flex-col fixed inset-0 md:relative w-full md:mt-12 md:max-w-[452px] h-screen md:h-[600px] mx-auto shadow-container md:rounded-xl overflow-hidden">
        <Header />
        <Comments />
        <Input setIsNotSigned={setIsNotSigned} />
        <p className="px-4 text-xs opacity-80">Press ctrl to delete comment</p>
      </div>
      {isNotSigned && <SignIn />}
    </>
  );
}
