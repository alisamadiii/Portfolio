import { COMMENT } from "@/Types/User";
import { useReplyStore } from "@/context/Reply";
import React from "react";

type Props = {
  comment: COMMENT;
};

import { BsFillReplyAllFill } from "react-icons/bs";

export default function Reply({ comment }: Props) {
  const { setReplyComment } = useReplyStore();

  return (
    <div className="cursor-pointer" onClick={() => setReplyComment(comment)}>
      <BsFillReplyAllFill />
    </div>
  );
}
