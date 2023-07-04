import React from "react";
import { db } from "@/utils/Firebase";
import { deleteDoc, doc } from "firebase/firestore";

type Props = {
  commentId: string;
};

import { BsFillTrashFill } from "react-icons/bs";

export default function Delete({ commentId }: Props) {
  const deletingComment = async (id: string) => {
    const docRef = doc(db, "comments", id);
    await deleteDoc(docRef);
  };
  return (
    <div
      className={`bg-blue-700/10 p-1 rounded-full cursor-pointer flex items-center`}
      onClick={() => deletingComment(commentId)}
    >
      <BsFillTrashFill />
    </div>
  );
}
