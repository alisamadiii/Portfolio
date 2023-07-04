import { COMMENT } from "@/Types/User";
import { User_Context } from "@/context/User_Context";
import { db } from "@/utils/Firebase";
import { doc, updateDoc } from "firebase/firestore";
import React, { useContext } from "react";
import { AiFillLike } from "react-icons/ai";
import { createToast } from "vercel-toast";

type Props = {
  comment: COMMENT;
};

export default function Like({ comment }: Props) {
  const { currentUser } = useContext(User_Context);

  // Finding comments
  const findingComment = (comment: COMMENT) => {
    return comment.likes.find((like) => like.id === currentUser?.uid);
  };

  //   Updating Likes
  const updatingLikes = (comment: COMMENT) => {
    if (currentUser == null) {
      //   setIsNotSigned(true);
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

  return (
    <div
      className={`bg-blue-700/10 p-1 rounded-full cursor-pointer flex items-center ${
        findingComment(comment) ? "text-blue-700" : "text-gray-500"
      }`}
      onClick={() => updatingLikes(comment)}
    >
      <AiFillLike />
      <span className="text-xs text-center">{comment.likes.length}</span>
    </div>
  );
}
