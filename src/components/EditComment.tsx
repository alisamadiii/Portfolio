import { COMMENT } from "@/Types/User";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/utils/Firebase";

type Props = {
  comment: COMMENT;
  setEditOpen: (a: boolean) => void;
};

export default function EditComment({ comment, setEditOpen }: Props) {
  const [update, setUpdate] = useState(comment.message);

  const submitHandler = async (e: any) => {
    e.preventDefault();
    const docRef = doc(db, "comments", comment.id);
    updateDoc(docRef, {
      message: update,
    });
    setEditOpen(false);
  };

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "tween" }}
      className="w-full gap-2 mt-auto"
      onSubmit={submitHandler}
    >
      <div className="flex items-center p-2 border-2 rounded-md border-primary">
        <input
          value={update}
          onChange={(e) => setUpdate(e.target.value)}
          type="text"
          className="w-full p-2 bg-transparent rounded-md outline-none"
          placeholder="Edit"
        />
      </div>
    </motion.form>
  );
}
