import React, { useState } from "react";

import { supabase } from "@/utils/supabase";
import { type Database } from "@/database.types";

import { allBlogs } from "@/.contentlayer/generated";

export const DeleteButton = ({ id }: { id: string }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const onDeletingHandler = async (id: string) => {
    setIsDeleting(true);
    await supabase.from("blog-comments").delete().eq("id", id);
    setIsDeleting(false);
  };

  return (
    <button
      className="rounded bg-red-700 px-3 py-1"
      onClick={() => onDeletingHandler(id)}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
};

export const ApproveButton = ({
  data,
  reply = null,
}: {
  data: Database["public"]["Tables"]["blog-comments"]["Row"];
  reply?: string | null;
}) => {
  const [isApproving, setIsApproving] = useState(false);

  const onApprovingHandler = async () => {
    const findingBlogs = allBlogs.find(
      (blog) => blog.slugAsParams === data.slug
    );

    console.log(findingBlogs);

    setIsApproving(true);
    await supabase
      .from("blog-comments")
      .update({ approve: true, reply })
      .eq("id", data.id);

    if (data.email) {
      const sendingEmailRes = await fetch(
        `/api/reply-email?title=${findingBlogs?.title}&comment=${data.comment}&blog_image=${findingBlogs?.blogImage}&to=${data.email}&reply=${reply}&blog_link=${`${process.env.NEXT_PUBLIC_WEBSITE_URL}/${findingBlogs?.slug}`}`,
        {
          method: "POST",
        }
      );

      const dataRes = await sendingEmailRes.json();

      console.log(dataRes);
    }
    setIsApproving(false);
  };

  return (
    <button
      className="rounded bg-blue-700 px-3 py-1"
      onClick={onApprovingHandler}
    >
      {isApproving ? "Approving..." : "Approve"}
    </button>
  );
};
